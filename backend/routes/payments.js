import { Router } from 'express';
import * as sb from '../lib/supabase.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const normStatus = (s) => {
  const v = String(s || '').trim().toLowerCase();
  if (['completed', 'paid', 'success', 'successful'].includes(v)) return 'Completed';
  if (['failed', 'declined', 'cancelled', 'canceled'].includes(v)) return 'Failed';
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

    const [pay, ord, cus] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('orders').select('id, customer_id'),
      supabase.from('customers').select('id, name'),
    ]);
    if (pay.error) throw pay.error;
    if (ord.error) throw ord.error;
    if (cus.error) throw cus.error;

    const orderToCustomer = new Map(ord.data.map((o) => [o.id, o.customer_id]));
    const customerName = new Map(cus.data.map((c) => [c.id, c.name]));

    const all = pay.data.map((p) => ({
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