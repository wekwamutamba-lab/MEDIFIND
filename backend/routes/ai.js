import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { selectAll } from '../lib/selectAll.js';
import { askGemini } from '../lib/gemini.js';
import { getStockRules, expiryLimit } from '../lib/stockRules.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// The supplier search (POST /api/find) lives in sourcing.js.

// POST /api/insights
router.post('/insights', async (req, res) => {
  try {
    const data = await selectAll(() =>
      supabase.from('products').select('id, name, quantity, expiry_date, category')
    );

    // "low" and "expiring" use the pharmacy's own rules from the Settings page
    const rules = await getStockRules();
    const until = expiryLimit(rules);
    const low = (data || []).filter((p) => p.quantity < rules.lowStock);
    const expiring = (data || []).filter((p) => p.expiry_date && p.expiry_date <= until);
    // the fallback suggests topping each item back up to about 50 units (more if the low level is high)
    const target = Math.max(50, Math.round(rules.lowStock * 2.5));

    const fallback = {
      summary: `${low.length} products are low or out of stock and ${expiring.length} expire within ${rules.expiryDays} days. Restock the lowest items first and discount expiring stock.`,
      restock: low
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6)
        .map((p) => ({
          product: p.name,
          suggestedQty: Math.max(target - p.quantity, rules.lowStock),
          reason: p.quantity === 0 ? 'Out of stock' : `Only ${p.quantity} units left`,
        })),
      expiring: expiring.slice(0, 6).map((p) => ({ product: p.name, expiry_date: p.expiry_date })),
    };

    let result = fallback;
    try {
      const ai = await askGemini(
        'You are Pill, a pharmacy stock assistant. From the data, return ONLY JSON {"summary": string, "restock": [{"product": string, "suggestedQty": number, "reason": string}], "expiring": [{"product": string, "expiry_date": string}]}. Max 6 items per list. No medical advice.',
        JSON.stringify({ low: low.slice(0, 15), expiring: expiring.slice(0, 15) })
      );
      if (ai && ai.summary && Array.isArray(ai.restock) && Array.isArray(ai.expiring)) result = ai;
    } catch (e) {
      console.warn('Gemini insights failed, using rule-based result:', e.message);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;