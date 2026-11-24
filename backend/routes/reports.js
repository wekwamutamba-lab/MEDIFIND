import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { loadOrders } from '../lib/data.js';
import { selectAll } from '../lib/selectAll.js';
import { getStockRules, expiryFlags } from '../lib/stockRules.js';
import { forecastStock, DEFAULT_HORIZON } from '../lib/forecast.js';
import { weeklySummary } from '../lib/weekly.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// Admin only (not in TILL_ALLOWED). Both use plain arithmetic on this pharmacy's
// own records, no AI.

async function load(pharmacy) {
  const [orders, products] = await Promise.all([
    loadOrders(pharmacy),
    selectAll(() => pharmacy.select('products', 'id, name, quantity, expiry_date')),
  ]);
  return { orders, products };
}

// GET /api/reports/forecast?days=14  -> products that run out within that many days
router.get('/forecast', async (req, res) => {
  try {
    const days = Math.floor(Number(req.query.days));
    const horizon = days >= 1 && days <= 90 ? days : DEFAULT_HORIZON;
    const { orders, products } = await load(req.pharmacy);
    res.json(forecastStock(products, orders, { horizon }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/weekly  -> this week's figures and a message ready to send
router.get('/weekly', async (req, res) => {
  try {
    const pid = req.pharmacy.id;
    const [{ orders, products }, rules, ph] = await Promise.all([
      load(req.pharmacy),
      getStockRules(pid),
      supabase.from('pharmacies').select('name, whatsapp, email').eq('id', pid).limit(1),
    ]);
    const pharmacy = ph.data?.[0] || {};

    const stock = { low: 0, expiring: 0, expired: 0, expiryDays: rules.expiryDays };
    for (const p of products) {
      if ((Number(p.quantity) || 0) < rules.lowStock) stock.low++;
      const f = expiryFlags(p.expiry_date, rules);
      // only stock still on the shelf matters
      if ((Number(p.quantity) || 0) > 0) {
        if (f.expired) stock.expired++;
        if (f.expiring_soon) stock.expiring++;
      }
    }

    const summary = weeklySummary({
      orders,
      forecast: forecastStock(products, orders),
      stock,
      pharmacy,
    });
    // where the Send buttons send it: the pharmacy's own WhatsApp and email (Settings)
    res.json({ ...summary, send_to: { whatsapp: pharmacy.whatsapp || '', email: pharmacy.email || '' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
