import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { loadOrders, normOrderStatus } from '../lib/data.js';

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

    const all = await loadOrders();
    const stats = {
      total: all.length,
      completed: all.filter((o) => o.order_status === 'Completed').length,
      pending: all.filter((o) => o.order_status === 'Pending').length,
      cancelled: all.filter((o) => o.order_status === 'Cancelled').length,
    };

    let rows = all;
    if (wanted) rows = rows.filter((o) => o.order_status === wanted);
    if (search) {
      rows = rows.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(search) ||
          o.product_name.toLowerCase().includes(search) ||
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
        .from('products').select('*').ilike('name', product_name).limit(1);
      if (pe) throw pe;
      if (!data || !data.length) return res.status(404).json({ error: 'Product not found' });
      product = data[0];
    }
    if (product.quantity < quantity) {
      return res.status(400).json({ error: `Only ${product.quantity} units in stock` });
    }

    // find or create the customer
    let customerId;
    const { data: found } = await supabase.from('customers').select('id').ilike('name', name).limit(1);
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
    const { data: order, error: oe } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        product_id,
        quantity,
        total,
        order_date: new Date().toISOString(),
        status: 'Pending',
        payment_status: 'Pending',
      })
      .select('id').single();
    if (oe) throw oe;

    await supabase.from('products').update({ quantity: product.quantity - quantity }).eq('id', product_id);
    await supabase.from('payments').insert({
      order_id: order.id, amount: total, status: 'Pending', method: 'Cash',
      payment_date: new Date().toISOString(),
    });

    const all = await loadOrders();
    res.status(201).json(all.find((o) => o.id === order.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id  { order_status }
router.patch('/:id', async (req, res) => {
  try {
    const status = normOrderStatus(req.body?.order_status);
    const updates = { status };
    if (status === 'Completed') updates.payment_status = 'Paid';
    const { error } = await supabase.from('orders').update(updates).eq('id', req.params.id);
    if (error) throw error;
    const all = await loadOrders();
    const order = all.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;