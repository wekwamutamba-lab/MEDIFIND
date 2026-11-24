import { Router } from 'express';
import { selectAll } from '../lib/selectAll.js';

const router = Router();

const normStatus = (s) => {
  const v = String(s || '').trim().toLowerCase();
  if (['completed', 'paid', 'success', 'successful'].includes(v)) return 'Completed';
  if (['failed', 'declined', 'cancelled', 'canceled', 'refunded'].includes(v)) return 'Failed';
  return 'Pending';
};

// GET /api/payments?search=&status=&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const search = String(req.query.search || '').trim().toLowerCase();
    const wanted = ['Completed', 'Pending', 'Failed'].find(
      (s) => s.toLowerCase() === String(req.query.status || '').trim().toLowerCase()
    );

    const [payments, orders, customers] = await Promise.all([
      selectAll(() =>
        req.pharmacy.select('payments', '*').order('payment_date', { ascending: false })
      ),
      selectAll(() => req.pharmacy.select('orders', 'id, customer_id')),
      selectAll(() => req.pharmacy.select('customers', 'id, name')),
    ]);

    const orderToCustomer = new Map(orders.map((o) => [o.id, o.customer_id]));
    const customerName = new Map(customers.map((c) => [c.id, c.name]));

    const all = payments.map((p) => ({
      id: p.id,
      customer_name: customerName.get(orderToCustomer.get(p.order_id)) || 'Unknown',
      payment_date: p.payment_date,
      amount: Number(p.amount) || 0,
      status: normStatus(p.status),
      method: p.method || 'Cash',
      order_id: p.order_id,
    }));

    const stats = {
      completed: all.filter((p) => p.status === 'Completed').length,
      pending: all.filter((p) => p.status === 'Pending').length,
      failed: all.filter((p) => p.status === 'Failed').length,
      // money actually collected, over every payment (not just the rows on screen)
      collected:
        Math.round(
          all.filter((p) => p.status === 'Completed').reduce((s, p) => s + p.amount, 0) * 100
        ) / 100,
    };

    let rows = all;
    if (wanted) rows = rows.filter((p) => p.status === wanted);
    if (search) {
      rows = rows.filter(
        (p) =>
          p.customer_name.toLowerCase().includes(search) ||
          String(p.id).toLowerCase().includes(search)
      );
    }

    const total = rows.length;
    const data = rows.slice((page - 1) * limit, page * limit);
    res.json({ data, total, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;