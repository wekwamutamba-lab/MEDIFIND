// Stock-out forecast: how many days each product's stock will last at the rate it
// has been selling. Plain arithmetic on the pharmacy's own sales, no AI, so the
// same data always gives the same answer.
//
//   per day   = units sold in the last WINDOW_DAYS / WINDOW_DAYS
//   days left = units in stock / per day
//   order     = enough for COVER_DAYS of sales, minus what is in stock
//
// A pharmacy that started selling less than WINDOW_DAYS ago is measured over the
// days since its first sale (at least MIN_DAYS), so a new pharmacy is not told
// that everything sells slowly.

import { TIME_ZONE } from './time.js';

export const WINDOW_DAYS = 28;
export const MIN_DAYS = 7;
export const COVER_DAYS = 30;
export const DEFAULT_HORIZON = 14;

const DAY = 86400000;
// YYYY-MM-DD in the pharmacy's time zone
const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

// days shown to people: 0 means today
export const roundDays = (daysLeft) => (daysLeft < 1 ? 0 : Math.round(daysLeft));

// "Paracetamol runs out in about 6 days"
export function runsOutText(name, daysLeft) {
  if (daysLeft <= 0) return `${name} is out of stock`;
  const d = roundDays(daysLeft);
  if (d === 0) return `${name} runs out today`;
  return `${name} runs out in about ${d} day${d === 1 ? '' : 's'}`;
}

// products: [{ id, name, quantity }]
// orders:   loadOrders() rows ({ product_id, quantity, order_date, order_status })
// Returns { window_days, horizon_days, items } with items soonest first.
export function forecastStock(products, orders, { now = new Date(), horizon = DEFAULT_HORIZON } = {}) {
  const t = now.getTime();
  const from = t - WINDOW_DAYS * DAY;

  const sold = new Map();
  let first = Infinity;
  for (const o of orders) {
    if (o.order_status === 'Cancelled') continue;
    const at = new Date(o.order_date).getTime();
    if (!Number.isFinite(at) || at > t) continue;
    if (at < first) first = at;
    if (at < from) continue;
    const q = Number(o.quantity) || 0;
    if (q > 0) sold.set(o.product_id, (sold.get(o.product_id) || 0) + q);
  }

  // days the sales are spread over
  const since = Number.isFinite(first) ? (t - first) / DAY : 0;
  const days = Math.min(WINDOW_DAYS, Math.max(MIN_DAYS, since));

  const items = [];
  for (const p of products) {
    const units = sold.get(p.id) || 0;
    if (!units) continue; // not selling, so it does not run out
    const perDay = units / days;
    const stock = Math.max(0, Number(p.quantity) || 0);
    const daysLeft = stock / perDay;
    if (daysLeft > horizon) continue;
    items.push({
      left: daysLeft,
      product_id: p.id,
      name: p.name,
      quantity: stock,
      sold_recently: units,
      per_day: Math.round(perDay * 10) / 10,
      days_left: roundDays(daysLeft),
      runs_out_on: localDate.format(new Date(t + daysLeft * DAY)),
      suggested_qty: Math.max(1, Math.ceil(perDay * COVER_DAYS - stock)),
      message: runsOutText(p.name, daysLeft),
    });
  }
  items.sort((a, b) => a.left - b.left || b.per_day - a.per_day);
  return {
    window_days: Math.round(days),
    horizon_days: horizon,
    cover_days: COVER_DAYS,
    items: items.map(({ left, ...rest }) => rest),
  };
}
