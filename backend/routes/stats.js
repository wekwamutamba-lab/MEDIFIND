import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { loadOrders, byMonth } from '../lib/data.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const round2 = (n) => Math.round(n * 100) / 100;

// GET /api/stats/overview
router.get('/overview', async (req, res) => {
  try {
    const orders = await loadOrders();
    const valid = orders.filter((o) => o.order_status !== 'Cancelled');
    const revenue = valid.reduce((s, o) => s + o.total, 0);

    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { count: lowStock } = await supabase
      .from('vw_products_with_status')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'In Stock');

    const byProduct = new Map();
    for (const o of valid) {
      byProduct.set(o.product_name, (byProduct.get(o.product_name) || 0) + o.quantity);
    }
    const topMedicines = [...byProduct.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    res.json({
      totalRevenue: round2(revenue),
      totalProfit: round2(revenue * 0.3),
      totalCustomers: count || 0,
      totalOrders: orders.length,
      lowStock: lowStock || 0,
      salesByMonth: byMonth(orders),
      topMedicines,
      latestOrders: orders.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/sales
router.get('/sales', async (req, res) => {
  try {
    const orders = await loadOrders();
    const valid = orders.filter((o) => o.order_status !== 'Cancelled');
    const revenue = valid.reduce((s, o) => s + o.total, 0);
    const profit = revenue * 0.3;

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grid = new Map();
    for (const o of valid) {
      const d = new Date(o.order_date);
      const key = `${DAYS[d.getDay()]}-${d.getHours()}`;
      grid.set(key, (grid.get(key) || 0) + 1);
    }
    const ordersByTime = [...grid.entries()].map(([k, count]) => {
      const [day, hour] = k.split('-');
      return { day, hour: Number(hour), count };
    });

    const prod = new Map();
    for (const o of valid) {
      const p = prod.get(o.product_name) || {
        name: o.product_name,
        category: o.category,
        revenue: 0,
      };
      p.revenue += o.total;
      prod.set(o.product_name, p);
    }
    const topProducts = [...prod.values()]
      .map((p) => ({ ...p, revenue: round2(p.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    res.json({
      totalRevenue: round2(revenue),
      totalProfit: round2(profit),
      totalCost: round2(revenue - profit),
      avgOrderValue: valid.length ? round2(revenue / valid.length) : 0,
      revenueByMonth: byMonth(orders),
      ordersByTime,
      topProducts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;