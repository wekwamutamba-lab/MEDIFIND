import { Router } from 'express';
import { loadOrders } from '../lib/data.js';
import { selectAll } from '../lib/selectAll.js';
import { phoneDigits, isPlaceholderEmail } from '../lib/customers.js';
import { sendError } from '../lib/errors.js';

const router = Router();

// GET /api/customers?search=&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const search = String(req.query.search || '').trim().toLowerCase();

    const [customers, orders] = await Promise.all([
      selectAll(() => req.pharmacy.select('customers', '*')),
      loadOrders(req.pharmacy),
    ]);

    const agg = new Map();
    for (const o of orders) {
      if (o.order_status === 'Cancelled') continue;
      const a = agg.get(o.customer_id) || { n: 0, spent: 0, last: null };
      a.n += 1;
      a.spent += o.total;
      if (!a.last || new Date(o.order_date) > new Date(a.last)) a.last = o.order_date;
      agg.set(o.customer_id, a);
    }

    const all = customers.map((x) => {
      const a = agg.get(x.id) || { n: 0, spent: 0, last: null };
      return {
        id: x.id,
        name: x.name,
        // customers saved without an email get a made-up one (…@walkin.medifind): never show it
        email: isPlaceholderEmail(x.email) ? '' : x.email || '',
        phone: x.phone || '',
        total_orders: a.n,
        total_spent: Math.round(a.spent * 100) / 100,
        last_order_date: a.last,
      };
    });

    const returning = all.filter((x) => x.total_orders > 1).length;
    const totalSpent = all.reduce((s, x) => s + x.total_spent, 0);
    const stats = {
      total: all.length,
      // over every customer, so the page cards do not depend on which rows are on screen
      totalOrders: all.reduce((s, x) => s + x.total_orders, 0),
      totalSpent: Math.round(totalSpent * 100) / 100,
      newCustomers: all.filter((x) => x.total_orders <= 1).length,
      returningPercent: all.length ? Math.round((returning / all.length) * 100) : 0,
    };

    let rows = all;
    if (search) {
      // a phone number matches by its digits, however it was typed
      const digits = phoneDigits(search).replace(/^263/, '');
      rows = rows.filter(
        (x) =>
          x.name.toLowerCase().includes(search) ||
          x.email.toLowerCase().includes(search) ||
          (digits.length >= 4 && phoneDigits(x.phone).includes(digits))
      );
    }
    res.json({ data: rows.slice((page - 1) * limit, page * limit), total: rows.length, stats });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;