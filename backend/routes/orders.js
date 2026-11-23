import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { loadOrders, normOrderStatus, normPaymentStatus } from '../lib/data.js';
import { adjustStock, restoreStock, exactIlike } from '../lib/stock.js';
import { isAdmin, staffName } from '../lib/auth.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// GET /api/orders?search=&status=&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const search = String(req.query.search || '').trim().toLowerCase();
    const wanted = ['Completed', 'Pending', 'Cancelled'].find(
      (s) => s.toLowerCase() === String(req.query.status || '').trim().toLowerCase()
    );

    // Till operators only see the sales they made themselves
    let all = await loadOrders();
    if (!isAdmin(req)) all = all.filter((o) => o.cashier_id === req.user.id);
    const stats = {
      total: all.length,
      completed: all.filter((o) => o.order_status === 'Completed').length,
      pending: all.filter((o) => o.order_status === 'Pending').length,
      cancelled: all.filter((o) => o.order_status === 'Cancelled').length,
      // revenue of every order that was not cancelled
      revenue:
        Math.round(
          all.filter((o) => o.order_status !== 'Cancelled').reduce((s, o) => s + o.total, 0) * 100
        ) / 100,
    };

    let rows = all;
    if (wanted) rows = rows.filter((o) => o.order_status === wanted);
    if (search) {
      rows = rows.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(search) ||
          o.product_name.toLowerCase().includes(search) ||
          (o.cashier_name || '').toLowerCase().includes(search) ||
          String(o.id).toLowerCase().includes(search)
      );
    }
    res.json({ data: rows.slice((page - 1) * limit, page * limit), total: rows.length, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders  { customer_name, product_id OR product_name, quantity }
router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.customer_name || '').trim();
    const product_id = req.body?.product_id;
    const product_name = String(req.body?.product_name || '').trim();
    const quantity = Math.max(parseInt(req.body?.quantity) || 1, 1);
    if (!name) {
      return res.status(400).json({ error: 'customer_name is required' });
    }
    if (!product_id && !product_name) {
      return res.status(400).json({ error: 'product_id or product_name is required' });
    }

    let product;
    if (product_id) {
      const { data, error: pe } = await supabase
        .from('products').select('*').eq('id', product_id).single();
      if (pe || !data) return res.status(404).json({ error: 'Product not found' });
      product = data;
    } else {
      const { data, error: pe } = await supabase
        .from('products').select('*').ilike('name', exactIlike(product_name)).limit(1);
      if (pe) throw pe;
      if (!data || !data.length) return res.status(404).json({ error: 'Product not found' });
      product = data[0];
    }

    // Take the stock first; this fails with 400 if there is not enough
    await adjustStock(product.id, -quantity);

    let orderId = null;
    try {
      // find or create the customer
      let customerId;
      const { data: found, error: fe } = await supabase
        .from('customers').select('id').ilike('name', exactIlike(name)).limit(1);
      if (fe) throw fe;
      if (found && found.length) {
        customerId = found[0].id;
      } else {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
        const { data: created, error: ce } = await supabase
          .from('customers')
          .insert({ name, email: `${slug}@walkin.medifind`, phone: null, address: null })
          .select('id').single();
        if (ce) throw ce;
        customerId = created.id;
      }

      const total = Math.round(quantity * Number(product.price || 0) * 100) / 100;
      const now = new Date().toISOString();
      const { data: order, error: oe } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          product_id: product.id,
          quantity,
          total,
          order_date: now,
          status: 'Pending',
          payment_status: 'Pending',
          cashier_id: req.user.id,
          cashier_name: staffName(req),
        })
        .select('id').single();
      if (oe) throw oe;
      orderId = order.id;

      const { error: pye } = await supabase.from('payments').insert({
        order_id: order.id, amount: total, status: 'Pending', method: 'Cash', payment_date: now,
      });
      if (pye) throw pye;
    } catch (err) {
      // Undo so a failed order does not leave stock missing or a half-saved order behind
      if (orderId) {
        await supabase.from('payments').delete().eq('order_id', orderId);
        await supabase.from('orders').delete().eq('id', orderId);
      }
      await restoreStock(product.id, quantity);
      throw err;
    }

    const all = await loadOrders();
    res.status(201).json(all.find((o) => o.id === orderId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

const KNOWN_STATUSES = ['pending', 'completed', 'complete', 'delivered', 'done', 'cancelled', 'canceled'];

// PATCH /api/orders/:id  { order_status }
// Cancelling puts the stock back and marks the payment Failed (or Refunded if it was paid).
// Re-opening a cancelled order takes the stock again. Completing marks the payment paid.
router.patch('/:id', async (req, res) => {
  try {
    const raw = String(req.body?.order_status ?? req.body?.status ?? '').trim().toLowerCase();
    if (!KNOWN_STATUSES.includes(raw)) {
      return res.status(400).json({ error: 'order_status must be Pending, Completed or Cancelled' });
    }
    const next = normOrderStatus(raw);

    const { data: row, error: re } = await supabase
      .from('orders')
      .select('id, status, payment_status, product_id, quantity')
      .eq('id', req.params.id)
      .maybeSingle();
    if (re) throw re;
    if (!row) return res.status(404).json({ error: 'Order not found' });

    const prev = normOrderStatus(row.status);
    const qty = Number(row.quantity) || 0;
    let stockDelta = 0;
    if (row.product_id && qty > 0) {
      if (next === 'Cancelled' && prev !== 'Cancelled') stockDelta = qty; // back on the shelf
      if (prev === 'Cancelled' && next !== 'Cancelled') stockDelta = -qty; // taken again
    }

    const updates = { status: next };
    let paymentStatus = null; // value for the payments table
    if (next === 'Completed') {
      updates.payment_status = 'Paid';
      paymentStatus = 'Completed';
    } else if (next === 'Cancelled' && prev !== 'Cancelled') {
      const wasPaid = normPaymentStatus(row.payment_status) === 'Paid';
      updates.payment_status = wasPaid ? 'Refunded' : 'Failed';
      paymentStatus = wasPaid ? 'Refunded' : 'Failed';
    } else if (prev === 'Cancelled' && next === 'Pending') {
      updates.payment_status = 'Pending';
      paymentStatus = 'Pending';
    }

    // Re-opening needs the stock to still be there (400 if not)
    if (stockDelta < 0) await adjustStock(row.product_id, stockDelta);

    // Only apply if nobody changed the status since we read it
    const { data: changed, error: ue } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', row.id)
      .eq('status', row.status)
      .select('id');
    if (ue || !changed?.length) {
      if (stockDelta < 0) await restoreStock(row.product_id, -stockDelta);
      if (ue) throw ue;
      return res.status(409).json({ error: 'This order was just changed. Reload and try again.' });
    }

    if (stockDelta > 0) {
      try {
        await adjustStock(row.product_id, stockDelta);
      } catch (err) {
        // Could not return the stock, so undo the cancellation
        await supabase
          .from('orders')
          .update({ status: row.status, payment_status: row.payment_status })
          .eq('id', row.id);
        throw err;
      }
    }

    if (paymentStatus) {
      const { error: pe } = await supabase
        .from('payments').update({ status: paymentStatus }).eq('order_id', row.id);
      if (pe) throw pe;
    }

    const all = await loadOrders();
    res.json(all.find((o) => o.id === row.id));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
