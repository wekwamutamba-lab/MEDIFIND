import { Router } from 'express';
import { selectAll } from '../lib/selectAll.js';
import { askGemini } from '../lib/gemini.js';
import { loadOrders } from '../lib/data.js';
import { getStockRules, expiryLimit, expiryFlags } from '../lib/stockRules.js';
import { forecastStock } from '../lib/forecast.js';

const router = Router();

// The supplier search (POST /api/find) lives in sourcing.js.

const MAX_ITEMS = 6;

// POST /api/insights
// Pill: what will run out soon and what is expiring.
// The list of products and every number in it (days left, how much to order) are
// worked out here from the pharmacy's own stock and sales (lib/forecast.js). The AI
// only writes the one- or two-sentence summary at the top; it cannot add a product
// or change a number in the list.
router.post('/insights', async (req, res) => {
  try {
    const [products, orders, rules] = await Promise.all([
      selectAll(() => req.pharmacy.select('products', 'id, name, quantity, expiry_date, category')),
      loadOrders(req.pharmacy),
      getStockRules(req.pharmacy.id),
    ]);

    // 1. selling items that run out within 14 days, soonest first
    const forecast = forecastStock(products, orders);
    const restock = forecast.items.map((x) => ({
      product: x.name,
      suggestedQty: x.suggested_qty,
      days_left: x.days_left,
      per_day: x.per_day,
      quantity: x.quantity,
      reason:
        x.quantity === 0
          ? `Out of stock. It sells about ${x.per_day} a day.`
          : `${x.quantity} left, sells about ${x.per_day} a day, so it runs out ${x.days_left === 0 ? 'today' : `in about ${x.days_left} day${x.days_left === 1 ? '' : 's'}`}.`,
    }));

    // 2. then low-stock items that have not sold in the last 4 weeks
    const listed = new Set(restock.map((r) => r.product));
    const target = Math.max(50, Math.round(rules.lowStock * 2.5));
    for (const p of [...products].sort((a, b) => a.quantity - b.quantity)) {
      if (p.quantity >= rules.lowStock || listed.has(p.name)) continue;
      restock.push({
        product: p.name,
        suggestedQty: Math.max(target - p.quantity, rules.lowStock),
        days_left: null,
        per_day: 0,
        quantity: p.quantity,
        reason: `${p.quantity === 0 ? 'Out of stock' : `Only ${p.quantity} left`}, below your low-stock level of ${rules.lowStock}. No sales in the last 4 weeks, so order only if you expect demand.`,
      });
    }

    const until = expiryLimit(rules);
    const expiring = products
      .filter((p) => p.expiry_date && p.expiry_date <= until && p.quantity > 0)
      .sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)))
      .map((p) => ({ product: p.name, expiry_date: p.expiry_date, expired: expiryFlags(p.expiry_date, rules).expired }));

    const top = restock.slice(0, MAX_ITEMS);
    const soon = top.filter((r) => r.days_left != null && r.days_left <= 7).length;
    let summary;
    if (!top.length && !expiring.length) {
      summary = 'Nothing needs restocking right now, and nothing expires soon.';
    } else {
      const parts = [];
      if (top.length) {
        parts.push(soon
          ? `${soon} product${soon === 1 ? '' : 's'} will run out within a week at the current rate of sales. Order ${top[0].product} first.`
          : `${restock.length} product${restock.length === 1 ? ' needs' : 's need'} restocking soon.`);
      }
      const gone = expiring.filter((x) => x.expired).length;
      const near = expiring.length - gone;
      if (gone) parts.push(`${gone} product${gone === 1 ? ' has' : 's have'} already expired: take ${gone === 1 ? 'it' : 'them'} off the shelf.`);
      if (near) parts.push(`${near} product${near === 1 ? ' expires' : 's expire'} within ${rules.expiryDays} days: sell or discount ${near === 1 ? 'it' : 'them'} first.`);
      summary = parts.join(' ');
    }

    const result = { summary, restock: top, expiring: expiring.slice(0, MAX_ITEMS), used_ai: false };

    // The AI writes the summary at the top; the list and its numbers stay ours
    if (top.length || expiring.length) {
      try {
        const ai = await askGemini(
          'You are Pill, a pharmacy stock assistant. You get the products that need restocking (with units left, units sold a day, days left and the quantity to order) and the products close to expiry. ' +
            'Return ONLY JSON {"summary": string}: 1 to 2 short sentences on what to do first. ' +
            'Use only the products and numbers given; do not invent any. No medical advice.',
          JSON.stringify({ restock: top, expiring: result.expiring })
        );
        if (ai && typeof ai.summary === 'string' && ai.summary.trim()) {
          result.summary = ai.summary.trim().slice(0, 400);
          result.used_ai = true;
        }
      } catch (e) {
        console.warn('Gemini insights failed, using the plain summary:', e.message);
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
