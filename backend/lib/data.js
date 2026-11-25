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
    selectAll(() => pharmacy.select('products', 'id, name, category, price')),
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
    order_date: r.order_date,
    payment_status: normPaymentStatus(r.payment_status),
    order_status: normOrderStatus(r.status),
    cashier_id: r.cashier_id || null,
    cashier_name: r.cashier_name || null,
  }));
}

// Saves one order row and returns { data: { id }, error }.
// row.product_name keeps the medicine's name with the sale, so its history still
// shows it after the product is deleted (column added by migration_order_names.sql).
// If that SQL has not been run yet the column is missing: the sale is then saved
// without the name instead of failing at the till.
const missingColumn = (e, col) =>
  Boolean(e) && (e.code === 'PGRST204' || e.code === '42703') && String(e.message || '').includes(col);

export async function insertOrder(pharmacy, row) {
  const first = await pharmacy.insert('orders', row).select('id').single();
  if (!missingColumn(first.error, 'product_name')) return first;
  console.warn('orders.product_name is missing: run backend/supabase/migration_order_names.sql');
  const { product_name, ...rest } = row;
  return pharmacy.insert('orders', rest).select('id').single();
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
