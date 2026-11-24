// Reads a typed sale note such as "2 paracetamol and 1 amoxicillin for Tendai"
// and finds each medicine in the pharmacy's own products.
//
// Nothing is sold here: the till operator sees every line, can change or skip it,
// and only then adds it to the sale. The AI (when there is a key) only reads the
// note; it can only pick product names from the pharmacy's own list, and every
// name it returns is checked against that list. The customer's name and any phone
// number are taken out of the note before it is sent to the AI (textForAi).
// Without a key, or if the AI fails, the plain rules below read the note.

export const MAX_NOTE = 500;
export const MAX_LINES = 20;
const MAX_QTY = 1000;
const MAX_NAMES_FOR_AI = 400;

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
// words that say how it is packed, not what it is
const FILLER = new Set([
  'of', 'the', 'for', 'with', 'some', 'please', 'pls', 'pack', 'packs', 'packet', 'packets', 'box', 'boxes',
  'bottle', 'bottles', 'strip', 'strips', 'tab', 'tabs', 'tablet', 'tablets',
  'capsule', 'capsules', 'cap', 'caps', 'unit', 'units', 'pcs', 'pieces', 'piece',
]);

const NAME = "[A-Z][A-Za-z'’-]*(?:\\s+[A-Z][A-Za-z'’-]*){0,2}";
const CUSTOMER_END = new RegExp(`(?:^|[\\s,;])(?:[Ff]or|[Tt]o)\\s+(${NAME})\\s*\\.?\\s*$`);
const CUSTOMER_START = new RegExp(`^\\s*[Ff]or\\s+(${NAME})\\s*[:,-]\\s*`);
const CUSTOMER_LABEL = /(?:^|[\s,;])customer\s*:?\s+([A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*){0,2})\s*\.?\s*$/i;

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9.%]+/g, ' ')
    .replace(/(^|\s)\.|\.(\s|$)/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

// Takes "for Tendai" (with a capital letter) or "customer: Tendai" off the note
export function splitCustomer(note) {
  let text = String(note || '').trim();
  let customer = '';
  for (const re of [CUSTOMER_LABEL, CUSTOMER_END, CUSTOMER_START]) {
    const m = text.match(re);
    if (m) {
      customer = m[1].trim();
      text = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).trim();
      break;
    }
  }
  return { text, customer };
}

const qty = (n) => Math.min(MAX_QTY, Math.max(1, Math.floor(Number(n)) || 1));

// "2 paracetamol, amoxicillin x3 and one ORS" -> [{ said, quantity }]
export function parseLines(text) {
  const out = [];
  for (const raw of String(text || '').split(/\s*(?:,|;|\n|\+|&|\band\b|\bplus\b)\s*/i)) {
    let s = raw.trim().replace(/[.!]+$/, '');
    if (!s) continue;
    let q = 1;
    let m;
    if ((m = s.match(/^(\d{1,4})(?![\d.]|\s*(?:mg|mcg|ml|g|iu|%)\b)\s*(?:x|×|\*)?\s*(.+)$/i))) {
      q = m[1]; s = m[2];
    } else if ((m = s.match(/^(.+?)\s*(?:x|×|\*)\s*(\d{1,4})$/i)) || (m = s.match(/^(.+?)\s*\((\d{1,4})\)$/))) {
      s = m[1]; q = m[2];
    } else if ((m = s.match(/^([a-z]+)\s+(.+)$/i)) && NUMBER_WORDS[m[1].toLowerCase()]) {
      q = NUMBER_WORDS[m[1].toLowerCase()]; s = m[2];
    }
    s = s.trim();
    if (s) out.push({ said: s, quantity: qty(q) });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// How well what was typed fits a product name, 0 to 100: half for how much of what
// was typed is in the name, half for how much of the name was typed
export function score(said, productName) {
  const q = words(said).filter((w) => !FILLER.has(w));
  const p = words(productName);
  if (!q.length || !p.length) return 0;
  if (q.join(' ') === p.join(' ')) return 100;

  const used = new Set();
  let found = 0;
  for (const w of q) {
    let best = 0;
    let at = -1;
    p.forEach((x, i) => {
      let s = 0;
      if (x === w) s = 1;
      else if (w.length >= 3 && x.startsWith(w)) s = 0.9;
      else if (x.length >= 4 && w.startsWith(x)) s = 0.8;
      else if (w.length >= 4 && x.length >= 4 && !/\d/.test(w + x)) {
        const max = w.length >= 7 ? 2 : 1;
        if (editDistance(w, x, max) <= max) s = 0.7;
      }
      if (s > best) { best = s; at = i; }
    });
    found += best;
    if (at >= 0) used.add(at);
  }
  if (!found) return 0;
  return Math.round((found / q.length) * 50 + (used.size / p.length) * 50);
}

const AUTO_PICK = 60; // lowest score that is filled in for the till operator
const OPTION = 45; // lowest score shown as a choice

const pub = (p) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, quantity: Number(p.quantity) || 0 });

// Best matches first; in-stock products before out-of-stock ones when the fit is equal
export function rank(said, products) {
  return products
    .map((p) => ({ p, s: score(said, p.name) }))
    .filter((x) => x.s >= OPTION)
    .sort((a, b) => b.s - a.s || (b.p.quantity > 0) - (a.p.quantity > 0) || a.p.name.length - b.p.name.length)
    .slice(0, 4);
}

function lineFor(said, quantity, products, aiPick) {
  const ranked = rank(said, products);
  let chosen = null;
  if (aiPick) chosen = aiPick;
  else if (ranked[0] && ranked[0].s >= AUTO_PICK) chosen = ranked[0].p;
  const options = [chosen, ...ranked.map((x) => x.p)].filter(Boolean);
  const unique = [...new Map(options.map((p) => [p.id, p])).values()].slice(0, 4);
  // ask the till operator to look when more than one product fits (e.g. two strengths)
  const several = ranked.length > 1 && ranked[1].s >= AUTO_PICK;
  return {
    said,
    quantity: qty(quantity),
    product_id: chosen?.id ?? null,
    options: unique.map(pub),
    check: !chosen || several,
  };
}

// Product names to show the AI: all of them for a normal pharmacy, otherwise the
// ones that look a little like a word in the note
function namesForAi(text, products) {
  if (products.length <= MAX_NAMES_FOR_AI) return products.map((p) => p.name);
  const noteWords = words(text).filter((w) => w.length >= 3 && !FILLER.has(w));
  return products
    .filter((p) => words(p.name).some((x) => noteWords.some((w) => x.slice(0, 3) === w.slice(0, 3))))
    .slice(0, MAX_NAMES_FOR_AI)
    .map((p) => p.name);
}

// The copy of the note sent to the AI: phone numbers removed, and a trailing
// "for ..." / "to ..." removed when it is not a medicine (it is usually a name
// typed in lower case, e.g. "for tendai moyo"). Nothing else about the customer
// is in the note.
export function textForAi(text, products) {
  let t = String(text || '').replace(/\+?\d[\d\s-]{6,}\d/g, ' ');
  const m = t.match(/(?:^|[\s,;])(?:for|to)\s+([^,;\n]+)$/i);
  if (m && !products.some((p) => score(m[1], p.name) >= OPTION)) t = t.slice(0, m.index);
  return t.replace(/\s+/g, ' ').trim();
}

const AI_PROMPT =
  'A pharmacy till operator typed a short note about a sale. Split it into the medicines asked for. ' +
  'Return ONLY JSON {"lines":[{"said": string, "product": string|null, "quantity": number}]}. ' +
  '"said" is the words from the note for that medicine. "product" must be copied exactly from the ' +
  'product list, or null if nothing in the list clearly fits; never guess between different ' +
  'strengths or forms. Never give medical advice.';

// note: the typed text. products: [{ id, name, price, quantity }] (this pharmacy only).
// ask: optional (system, text) => JSON, e.g. askGemini. Returns
// { customer_name, lines: [{ said, quantity, product_id, options, check }], used_ai }
export async function readSaleNote(note, products, { ask } = {}) {
  const { text, customer } = splitCustomer(String(note || '').slice(0, MAX_NOTE));
  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

  const forAi = textForAi(text, products);
  if (ask && forAi) {
    try {
      const ai = await ask(AI_PROMPT, JSON.stringify({ note: forAi, products: namesForAi(forAi, products) }));
      const lines = (Array.isArray(ai?.lines) ? ai.lines : [])
        .filter((l) => l && String(l.said || l.product || '').trim())
        .slice(0, MAX_LINES)
        .map((l) => {
          const pick = byName.get(String(l.product || '').trim().toLowerCase()) || null;
          return lineFor(String(l.said || l.product).trim().slice(0, 100), l.quantity, products, pick);
        });
      if (lines.length) return { customer_name: customer, lines, used_ai: true };
    } catch (e) {
      console.warn('Gemini sale note failed, using plain rules:', e.message);
    }
  }

  const lines = parseLines(text).map((l) => lineFor(l.said, l.quantity, products, null));
  return { customer_name: customer, lines, used_ai: false };
}
