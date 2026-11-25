import { selectAll } from './selectAll.js';

// Which customer a New Sale belongs to.
//
// 1. A customer picked from the suggestions (customer_id) is that person. A phone
//    number or email typed for them is saved on them, unless it is already saved
//    for someone else (then the till operator is asked, as in 2).
// 2. A phone number or email already saved for someone is that person, but only if
//    the name typed is theirs too (or no name was typed). If the name is different,
//    nothing is guessed: the till operator is asked which they meant (409 CUSTOMER_CONFLICT).
// 3. Otherwise a customer with exactly that name is used, unless their saved phone
//    or email shows they are someone else. Then a new customer is made.
// Phone numbers are compared by their digits, so 0772 222 222 and +263772222222 match.

export const WALK_IN = 'Walk-in customer';
export const isPlaceholderEmail = (e) => String(e || '').toLowerCase().endsWith('@walkin.medifind');

export const phoneDigits = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '263' + d.slice(1);
  return d;
};
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function httpError(status, message, extra) {
  const e = new Error(message);
  e.status = status;
  e.extra = extra;
  return e;
}

const pub = (c) => ({
  id: c.id,
  name: c.name,
  phone: c.phone || '',
  email: isPlaceholderEmail(c.email) ? '' : c.email || '',
});

// Returns { customer } for an existing customer (with `update` when a missing phone
// or email should be saved on them), or { create: row } for a new one. Nothing is
// written here, so a sale that fails later leaves no stray customer.
export async function resolveCustomer(pharmacy, { customerId, name, phone, email }) {
  const p = phoneDigits(phone);
  const e = norm(email);
  const clash = (c, what) =>
    httpError(409, `That ${what} is already saved for ${c.name}.`, {
      code: 'CUSTOMER_CONFLICT',
      field: what === 'email' ? 'email' : 'phone',
      customer: pub(c),
    });

  if (customerId) {
    const { data, error } = await pharmacy.select('customers', '*').eq('id', customerId).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(404, 'That customer is no longer in your customer list. Pick them again.');

    // a new or changed phone number or email typed for them (an empty box keeps what is saved)
    const newPhone = p && p !== phoneDigits(data.phone);
    const newEmail = e && !isPlaceholderEmail(e) && e !== norm(data.email);
    if (!newPhone && !newEmail) return { customer: data };

    const others = (await selectAll(() => pharmacy.select('customers', '*'))).filter((x) => x.id !== data.id);
    const update = {};
    if (newPhone) {
      const owner = p.length >= 7 && others.find((x) => phoneDigits(x.phone) === p);
      if (owner) throw clash(owner, 'phone number');
      update.phone = phone;
    }
    if (newEmail) {
      const owner = others.find((x) => norm(x.email) === e);
      if (owner) throw clash(owner, 'email');
      update.email = e;
    }
    return { customer: data, update };
  }

  const all = await selectAll(() => pharmacy.select('customers', '*'));
  const typedName = Boolean(name) && norm(name) !== norm(WALK_IN);

  let match = null;
  if (p.length >= 7) {
    const c = all.find((x) => phoneDigits(x.phone) === p);
    if (c) match = { c, what: 'phone number' };
  }
  if (!match && e) {
    const c = all.find((x) => norm(x.email) === e);
    if (c) match = { c, what: 'email' };
  }
  if (match) {
    if (!typedName || norm(match.c.name) === norm(name)) return { customer: match.c };
    throw clash(match.c, match.what);
  }

  const finalName = typedName ? name : WALK_IN;
  // same name, and nothing saved on them that says they are someone else
  const fits = all.filter(
    (x) =>
      norm(x.name) === norm(finalName) &&
      (!p || !phoneDigits(x.phone)) &&
      (!e || !x.email || isPlaceholderEmail(x.email))
  );
  if (fits.length) {
    const c = fits[0];
    const update = {};
    if (typedName && p && !c.phone) update.phone = phone;
    if (typedName && e && (!c.email || isPlaceholderEmail(c.email))) update.email = e;
    return { customer: c, update: Object.keys(update).length ? update : null };
  }

  const slug = norm(finalName).replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'customer';
  return {
    create: {
      name: finalName,
      phone: phone || null,
      email: e || `${slug}.${Date.now().toString(36)}@walkin.medifind`,
      address: null,
    },
  };
}
