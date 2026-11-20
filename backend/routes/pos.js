import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { adjustStock, restoreStock } from '../lib/stock.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const METHODS = ['Cash', 'EcoCash', 'Card', 'Bank Transfer'];
const round2 = (n) => Math.round(n * 100) / 100;
const clean = (v) => String(v ?? '').trim();

// Finds an existing customer (by phone, email, then exact name) or creates a new one
async function findOrCreateCustomer({ name, phone, email }) {
  if (phone) {
    const { data } = await supabase.from('customers').select('*').eq('phone', phone).limit(1);
    if (data?.length) return { customer: data[0], created: false };
  }
  if (email) {
    const { data } = await supabase.from('customers').select('*').ilike('email', email).limit(1);
    if (data?.length) return { customer: data[0], created: false };
  }
  const exact = name.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: byName } = await supabase.from('customers').select('*').ilike('name', exact).limit(1);
  if (byName?.length) return { customer: byName[0], created: false };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'customer';
  const row = {
    name,
    phone: phone || null,
    email: email || `${slug}.${Date.now().toString(36)}@walkin.medifind`,
    address: null,
  };
  const { data: created, error } = await supabase.from('customers').insert(row).select().single();
  if (error) throw error;
  return { customer: created, created: true };
}

// POST /api/pos/checkout
// { customer_name, phone, email, payment_method, items: [{ product_id, quantity }] }
router.post('/checkout', async (req, res) => {
  try {
    const name = clean(req.body?.customer_name) || 'Walk-in customer';
    const phone = clean(req.body?.phone);
    const email = clean(req.body?.email).toLowerCase();
    const method = METHODS.includes(req.body?.payment_method) ? req.body.payment_method : 'Cash';

    // Merge duplicate lines and ignore bad ones
    const wanted = new Map();
    for (const it of Array.isArray(req.body?.items) ? req.body.items : []) {
      const id = it?.product_id;
      const q = Math.floor(Number(it?.quantity));
      if (!id || !(q > 0)) continue;
      wanted.set(id, (wanted.get(id) || 0) + q);
    }
    if (wanted.size === 0) return res.status(400).json({ error: 'Add at least one medicine to the sale' });
    if (wanted.size > 50) return res.status(400).json({ error: 'Too many items in one sale' });

    const { data: products, error: pe } = await supabase
      .from('products')
      .select('*')
      .in('id', [...wanted.keys()]);
    if (pe) throw pe;
    const pMap = new Map((products || []).map((p) => [p.id, p]));

    for (const id of wanted.keys()) {
      if (!pMap.has(id)) return res.status(404).json({ error: 'One of the medicines no longer exists' });
    }

    // Take the stock for every line first. adjustStock refuses (400) if there is not
    // enough, even when another sale happens at the same moment.
    const taken = [];
    try {
      for (const [id, q] of wanted) {
        await adjustStock(id, -q);
        taken.push([id, q]);
      }
    } catch (err) {
      for (const [id, q] of taken) await restoreStock(id, q);
      throw err;
    }

    const now = new Date().toISOString();
    const lines = [];
    const orderIds = [];
    let customer;
    let created;

    try {
      ({ customer, created } = await findOrCreateCustomer({ name, phone, email }));

      for (const [id, q] of wanted) {
        const p = pMap.get(id);
        const price = Number(p.price) || 0;
        const total = round2(price * q);

        const { data: order, error: oe } = await supabase
          .from('orders')
          .insert({
            customer_id: customer.id,
            product_id: id,
            quantity: q,
            total,
            order_date: now,
            status: 'Completed',
            payment_status: 'Paid',
          })
          .select('id')
          .single();
        if (oe) throw oe;
        orderIds.push(order.id);

        const { error: payErr } = await supabase.from('payments').insert({
          order_id: order.id,
          amount: total,
          status: 'Completed',
          method,
          payment_date: now,
        });
        if (payErr) throw payErr;

        lines.push({ product_id: id, name: p.name, quantity: q, unit_price: price, total });
      }
    } catch (err) {
      // Undo the whole sale so nothing is half-saved
      if (orderIds.length) {
        await supabase.from('payments').delete().in('order_id', orderIds);
        await supabase.from('orders').delete().in('id', orderIds);
      }
      for (const [id, q] of taken) await restoreStock(id, q);
      throw err;
    }
    const firstOrderId = String(orderIds[0] || '');

    res.status(201).json({
      receipt_no: firstOrderId.slice(0, 8).toUpperCase(),
      date: now,
      customer: { id: customer.id, name: customer.name, phone: customer.phone || '', email: customer.email || '' },
      customer_created: created,
      payment_method: method,
      items: lines,
      total: round2(lines.reduce((s, l) => s + l.total, 0)),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;