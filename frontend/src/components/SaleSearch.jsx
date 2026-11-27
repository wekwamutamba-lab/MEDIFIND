import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, AlertTriangle, Loader2, X } from 'lucide-react';
import { readSaleNote } from '../lib/api';

// The one box on New Sale, at the top of "Current sale". It does both jobs:
//   - type a medicine name: matching stock drops down, Enter or a click adds it
//   - type the whole sale ("2 paracetamol and 1 amoxicillin for Tendai"): Enter
//     lets MediFind read it (with AI when it is set up), and the lines it found
//     appear right under the box for the till operator to check before adding.
// Nothing is sold until "Complete sale".
//
// props:
//   search(text)                 -> Promise<products[]>  (this pharmacy's stock)
//   onAddProduct(product)        adds one unit of a product
//   onAddLines(lines, customer)  lines = [{ product, qty }] checked in the review

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const NUMBER_WORDS = /^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+\S/i;

// Text that reads like a whole sale rather than one medicine name
const looksLikeSale = (t) => {
  const s = String(t || '').trim();
  return (
    /^\d+\s*(x\s*)?[a-z]/i.test(s) || // "2 paracetamol", "2x paracetamol"
    NUMBER_WORDS.test(s) || // "two paracetamol"
    /[,;+&\n]/.test(s) || // "paracetamol, amoxicillin"
    /\s(and|plus|for)\s/i.test(s) || // "paracetamol and amoxicillin", "... for Tendai"
    /\s(x|×)\s*\d+$/i.test(s) // "paracetamol x2"
  );
};

export default function SaleSearch({ search, onAddProduct, onAddLines }) {
  const inputRef = useRef(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState({ q: null, products: [] }); // results for the text q
  const [active, setActive] = useState(0);
  const [reading, setReading] = useState(false);
  const [review, setReview] = useState(null); // { customer, usedAi, lines }
  const [error, setError] = useState('');

  const q = text.trim();
  const loading = open && found.q !== q;

  // Stock that matches what is typed (all of it, A to Z, while the box is empty)
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const products = await search(q);
        if (!cancelled) setFound({ q, products });
      } catch (e) {
        if (!cancelled) {
          setFound({ q, products: [] });
          setError(e.message);
        }
      }
    }, q ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open, search]);

  // What the list offers: matching medicines, and "read the whole sale" when the text
  // reads like a sale (first) or nothing matched by name (last, it allows for typos)
  const products = found.q === q ? found.products : [];
  const sale = looksLikeSale(q);
  const offerRead = q.length >= 3 && (sale || (!loading && products.length === 0));
  const options = [
    ...(offerRead && sale ? [{ kind: 'read' }] : []),
    ...products.map((p) => ({ kind: 'product', p, out: (p.quantity || 0) <= 0 })),
    ...(offerRead && !sale ? [{ kind: 'read' }] : []),
  ];
  const usable = options.map((o, i) => (o.out ? -1 : i)).filter((i) => i >= 0);
  const current = usable.includes(active) ? active : usable[0] ?? -1;

  const reset = () => {
    setText('');
    setActive(0);
  };

  // the list closes after each pick and opens again as soon as the next name is typed
  const addProduct = (p) => {
    onAddProduct(p);
    reset();
    setOpen(false);
    inputRef.current?.focus();
  };

  const read = async () => {
    if (!q || reading) return;
    setOpen(false);
    setReading(true);
    setError('');
    try {
      const res = await readSaleNote(q);
      setReview({
        customer: res.customer_name || '',
        usedAi: res.used_ai,
        lines: (res.lines || []).map((l) => ({
          said: l.said,
          options: l.options || [],
          pick: l.product_id || '',
          qty: l.quantity || 1,
          check: l.check,
        })),
      });
      reset();
    } catch (e) {
      setError(e.message || 'Could not read that');
    } finally {
      setReading(false);
    }
  };

  const choose = (o) => {
    if (!o || o.out) return;
    if (o.kind === 'read') read();
    else addProduct(o.p);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (!usable.length) return;
      const at = usable.indexOf(current);
      const next = e.key === 'ArrowDown' ? (at + 1) % usable.length : (at - 1 + usable.length) % usable.length;
      setActive(usable[next]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (loading && q) {
        // still searching: a sale can be read straight away, a name waits for its results
        if (sale) read();
        return;
      }
      choose(options[current]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // ---------- review of what was read ----------
  const change = (i, fields) =>
    setReview((r) => ({ ...r, lines: r.lines.map((l, j) => (j === i ? { ...l, ...fields } : l)) }));
  const picked = (l) => l.options.find((o) => o.id === l.pick) || null;
  const ready = (review?.lines || []).filter((l) => (picked(l)?.quantity || 0) > 0);
  const addReviewed = () => {
    onAddLines(
      ready.map((l) => ({ product: picked(l), qty: Math.max(1, Math.floor(Number(l.qty)) || 1) })),
      review.customer
    );
    setReview(null);
    inputRef.current?.focus();
    setOpen(false); // ready for the next name, the list opens when typing starts
  };

  const showList = open && !reading;
  const listId = 'sale-search-list';

  return (
    <div>
      <div className="relative">
        {reading ? (
          <Loader2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-sidebar" />
        ) : (
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
            setError('');
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          maxLength={500}
          disabled={reading}
          placeholder="Search a medicine, or type the whole sale"
          aria-label="Search a medicine, or type the whole sale"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && current >= 0 ? `${listId}-${current}` : undefined}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-10 text-sm focus:border-sidebar focus:outline-none focus:ring-2 focus:ring-lime disabled:bg-gray-50"
        />
        {text && !reading && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              reset();
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Clear"
          >
            <X size={16} />
          </button>
        )}

        {showList && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
          >
            {!q && <div className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase text-gray-400">Your stock</div>}
            {options.map((o, i) =>
              o.kind === 'read' ? (
                <div
                  key="read"
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 ${i === current ? 'bg-lime/40' : 'hover:bg-gray-50'}`}
                >
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-sidebar" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-sidebar">
                      {sale ? 'Read the whole sale' : 'Not found by name. Let MediFind read it'}
                    </div>
                    <div className="truncate text-xs text-gray-600">&quot;{q}&quot;</div>
                  </div>
                  {i === current && <kbd className="ml-auto shrink-0 self-center rounded border border-gray-300 bg-white px-1.5 text-[10px] text-gray-500">Enter</kbd>}
                </div>
              ) : (
                <div
                  key={o.p.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  aria-disabled={o.out}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => !o.out && setActive(i)}
                  onClick={() => choose(o)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    o.out ? 'cursor-not-allowed opacity-50' : `cursor-pointer ${i === current ? 'bg-lime/40' : 'hover:bg-gray-50'}`
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900">{o.p.name}</div>
                    <div className="truncate text-xs text-gray-500">{o.p.category || 'General'}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-sidebar">{money(o.p.price)}</div>
                    <div className={`text-[11px] ${o.out ? 'font-semibold text-red-600' : o.p.status === 'Low Stock' ? 'text-orange-600' : 'text-gray-500'}`}>
                      {o.out ? 'Out of stock' : `${o.p.quantity} in stock`}
                    </div>
                  </div>
                </div>
              )
            )}
            {loading && !options.length && <div className="px-3 py-2.5 text-sm text-gray-400">Searching…</div>}
            {!loading && !options.length && (
              <div className="px-3 py-2.5 text-sm text-gray-500">{q ? 'No medicine by that name.' : 'No medicines in stock yet.'}</div>
            )}
          </div>
        )}
      </div>

      {!review && !error && (
        <p className="mt-1.5 text-xs text-gray-500">
          Type a name to find it in your stock, or the whole sale in one line, e.g. &quot;2 paracetamol and 1 amoxicillin
          for Tendai&quot;, and press Enter.
        </p>
      )}
      {error && <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {review && (
        <div className="mt-3 space-y-2 rounded-xl border border-sidebar/20 bg-sidebar/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Sparkles size={15} className="text-sidebar" /> Check these before they go into the sale
          </div>
          {review.lines.length === 0 && (
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-gray-600">
              No medicines found in that. Try something like &quot;2 paracetamol&quot;.
            </div>
          )}
          {review.lines.map((l, i) => {
            const p = picked(l);
            const out = p && p.quantity <= 0;
            const over = p && !out && Number(l.qty) > p.quantity;
            const warn = !p || out || l.check;
            return (
              <div key={i} className={`rounded-lg border bg-white p-2.5 ${warn ? 'border-amber-300' : 'border-gray-200'}`}>
                <div className="mb-1.5 text-xs text-gray-500">
                  You typed: <span className="font-medium text-gray-700">&quot;{l.said}&quot;</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={l.pick}
                    onChange={(e) => change(i, { pick: e.target.value, check: false })}
                    aria-label={`Medicine for "${l.said}"`}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                  >
                    <option value="">Skip this line</option>
                    {l.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {money(o.price)} · {o.quantity > 0 ? `${o.quantity} in stock` : 'out of stock'}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    Qty
                    <input
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={(e) => change(i, { qty: e.target.value })}
                      className="w-16 rounded-lg border border-gray-300 py-1.5 text-center text-sm text-gray-900"
                    />
                  </label>
                </div>
                {warn && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={12} />
                    {!l.options.length
                      ? 'Not found in your stock. This line will be skipped.'
                      : !p
                        ? 'Choose the medicine, or skip this line.'
                        : out
                          ? 'Out of stock. This line will be skipped.'
                          : 'More than one medicine fits. Check this is the right one.'}
                  </div>
                )}
                {over && <div className="mt-1.5 text-xs text-amber-700">Only {p.quantity} in stock, so {p.quantity} will be added.</div>}
              </div>
            );
          })}
          {review.customer && (
            <div className="text-xs text-gray-600">
              Customer: <span className="font-semibold">{review.customer}</span> (goes in the Customer box if it is still empty)
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={addReviewed}
              disabled={!ready.length}
              className="rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-sidebar hover:bg-[#cfe85c] disabled:opacity-50"
            >
              {ready.length ? `Add ${ready.length} to sale` : 'Nothing to add'}
            </button>
            <button
              type="button"
              onClick={() => setReview(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <span className="text-[11px] text-gray-500">
              {review.usedAi ? 'Read with AI from your own stock list.' : 'Read with MediFind’s built-in rules.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
