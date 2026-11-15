import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { loadOrders } from '../lib/data.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// GET /api/customers?search=&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const search = String(req.query.search || '').trim().toLowerCase();

    const [c, orders] = await Promise.all([
      supabase.from('customers').select('*'),
      loadOrders(),
    ]);
    if (c.error) throw c.error;

    const agg = new Map();
    for (const o of orders) {
      if (o.order_status === 'Cancelled') continue;
      const a = agg.get(o.customer_id) || { n: 0, spent: 0, last: null };
      a.n += 1;
      a.spent += o.total;
      if (!a.last || new Date(o.order_date) > new Date(a.last)) a.last = o.order_date;
      agg.set(o.customer_id, a);
    }

    const all = c.data.map((x) => {
      const a = agg.get(x.id) || { n: 0, spent: 0, last: null };
      return {
        id: x.id,
        name: x.name,
        email: x.email || '',
        phone: x.phone || '',
        total_orders: a.n,
        total_spent: Math.round(a.spent * 100) / 100,
        last_order_date: a.last,
      };
    });

    const returning = all.filter((x) => x.total_orders > 1).length;
    const stats = {
      total: all.length,
      newCustomers: all.filter((x) => x.total_orders <= 1).length,
      returningPercent: all.length ? Math.round((returning / all.length) * 100) : 0,
    };

    let rows = all;
    if (search) {
      rows = rows.filter(
        (x) => x.name.toLowerCase().includes(search) || x.email.toLowerCase().includes(search)
      );
    }
    res.json({ data: rows.slice((page - 1) * limit, page * limit), total: rows.length, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;