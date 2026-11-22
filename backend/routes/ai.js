import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { selectAll } from '../lib/selectAll.js';
import { askGemini } from '../lib/gemini.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// The supplier search (POST /api/find) lives in sourcing.js.

// POST /api/insights
router.post('/insights', async (req, res) => {
  try {
    const data = await selectAll(() =>
      supabase.from('products').select('id, name, quantity, expiry_date, category')
    );

    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const low = (data || []).filter((p) => p.quantity < 20);
    const expiring = (data || []).filter((p) => p.expiry_date && p.expiry_date <= in30);

    const fallback = {
      summary: `${low.length} products are low or out of stock and ${expiring.length} expire within 30 days. Restock the lowest items first and discount expiring stock.`,
      restock: low
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6)
        .map((p) => ({
          product: p.name,
          suggestedQty: Math.max(50 - p.quantity, 20),
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