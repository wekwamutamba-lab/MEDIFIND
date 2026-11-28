import * as sb from './supabase.js';
import { localParts } from './time.js';
import { selectAll } from './selectAll.js';

const supabase = sb.supabase || sb.default;

export const normOrderStatus = (s) => {
  const v = String(s || '').trim().toLowerCase();
  if (['completed', 'complete', 'delivered', 'done'].includes(v)) return 'Completed';
  if (['cancelled', 'canceled'].includes(v)) return 'Cancelled';
  return 'Pending';
};

export const normPaymentStatus = (s) => {
  const v = String(s || '').trim().toLowerCase();
  if (['paid', 'completed', 'success'].includes(v)) return 'Paid';
  if (['failed', 'declined', 'refunded', 'unpaid'].includes(v)) return 'Failed';
  return 'Pending';
};

// Loads one pharmacy's orders joined with customer and product names, newest first.
// pharmacy = req.pharmacy (lib/tenant.js)
export async function loadOrders(pharmacy) {
  const [orders, customers, products] = await Promise.all([
    selectAll(() => pharmacy.select('orders', '*').order('order_date', { ascending: false })),
    selectAll(() => pharmacy.select('customers', 'id, name')),
    loadProductCosts(pharmacy),
  ]);

  const cMap = new Map(customers.map((x) => [x.id, x]));
  const pMap = new Map(products.map((x) => [x.id, x]));

  return orders.map((r) => ({
    id: r.id,
    customer_id: r.customer_id,
    product_id: r.product_id,
    customer_name: cMap.get(r.customer_id)?.name || 'Unknown',
    // the product's current name; if it was deleted, the name saved with the sale
    product_name: pMap.get(r.product_id)?.name || r.product_name || 'Unknown',
    category: pMap.get(r.product_id)?.category || 'General',
    quantity: r.quantity,
    total: Number(r.total) || 0,
    // what the medicines cost: saved with the sale, or for older sales the
    // product's cost price today; null when neither is known
    cost: saleCost(r, pMap.get(r.product_id)),
    order_date: r.order_date,
    payment_status: normPaymentStatus(r.payment_status),
    order_status: normOrderStatus(r.status),
    cashier_id: r.cashier_id || null,
    cashier_name: r.cashier_name || null,
  }));
}

// True when a database error says a column does not exist yet (its SQL has not been run)
export const missingColumn = (e, col) =>
  Boolean(e) && (e.code === 'PGRST204' || e.code === '42703') && String(e.message || '').includes(col);

const round2 = (n) => Math.round(n * 100) / 100;

// Products with their cost price. Before migration_cost_price.sql has been run the
// column is missing, so the products are read without it.
async function loadProductCosts(pharmacy) {
  try {
    return await selectAll(() => pharmacy.select('products', 'id, name, category, price, cost_price'));
  } catch (e) {
    if (!missingColumn(e, 'cost_price')) throw e;
    return selectAll(() => pharmacy.select('products', 'id, name, category, price'));
  }
}

// A cost price that has been set: a number, 0 or more. Empty means not set.
export function costPrice(p) {
  if (p?.cost_price == null || p.cost_price === '') return null;
  const n = Number(p.cost_price);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// What the medicines in one order row cost
function saleCost(r, product) {
  if (r.cost_total != null && r.cost_total !== '' && Number.isFinite(Number(r.cost_total))) {
    return Number(r.cost_total);
  }
  const unit = costPrice(product);
  return unit == null ? null : round2(unit * (Number(r.quantity) || 0));
}

// Profit from cost prices, for loadOrders() rows (leave out cancelled ones first).
// Sales whose medicine has no cost price are left out of profit and counted, so
// the page can say how many.
export function profitOf(orders) {
  let profit = 0;
  let cost = 0;
  let missing = 0;
  for (const o of orders) {
    if (o.cost == null) {
      missing++;
      continue;
    }
    cost += o.cost;
    profit += o.total - o.cost;
  }
  return { profit: round2(profit), cost: round2(cost), costed: orders.length - missing, missing };
}

// Saves one order row and returns { data: { id }, error }.
// row.product_name keeps the medicine's name with the sale, so its history still
// shows it after the product is deleted (migration_order_names.sql), and
// row.cost_total keeps what the medicines cost (migration_cost_price.sql).
// If one of those SQL files has not been run yet its column is missing: the sale
// is then saved without that value instead of failing at the till.
const OPTIONAL = { product_name: 'migration_order_names.sql', cost_total: 'migration_cost_price.sql' };

export async function insertOrder(pharmacy, row) {
  let data = row;
  for (;;) {
    const res = await pharmacy.insert('orders', data).select('id').single();
    const col = Object.keys(OPTIONAL).find((c) => c in data && missingColumn(res.error, c));
    if (!col) return res;
    console.warn(`orders.${col} is missing: run backend/supabase/${OPTIONAL[col]}`);
    const { [col]: _drop, ...rest } = data;
    data = rest;
  }
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Revenue for the last 6 months, oldest first: [{ month: 'Jun', value }],
// counted in the pharmacy's time zone
export function byMonth(orders, now = new Date()) {
  const today = localParts(now);
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const idx = today.year * 12 + today.month - i;
    const year = Math.floor(idx / 12);
    const month = idx % 12;
    buckets.push({ key: `${year}-${month}`, month: MONTHS[month], value: 0 });
  }
  for (const o of orders) {
    if (o.order_status === 'Cancelled') continue;
    const d = localParts(o.order_date);
    if (!d) continue;
    const b = buckets.find((x) => x.key === `${d.year}-${d.month}`);
    if (b) b.value += o.total;
  }
  return buckets.map(({ key, month, value }) => ({ month, year: Number(key.split('-')[0]), value: Math.round(value * 100) / 100 }));
}
