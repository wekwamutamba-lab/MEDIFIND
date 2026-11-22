import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as sb from '../lib/supabase.js';
import { selectAll } from '../lib/selectAll.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const DISCLAIMER =
  'MediFind does not give medical advice. In an emergency, contact a doctor or emergency services.';
const CENTER = { lat: -17.8292, lng: 31.0522 }; // Harare city centre
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function askGemini(system, userText) {
  if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: system });
  const result = await model.generateContent(userText);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const STOP = new Set(['need', 'urgently', 'urgent', 'please', 'looking', 'want', 'have', 'with', 'some', 'tablets', 'syrup', 'for', 'the', 'and', 'my', 'child', 'baby', 'fast']);

async function searchProducts(term) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, quantity, pharmacy_id')
    .ilike('name', `%${term}%`)
    .gt('quantity', 0);
  if (error) throw error;
  return data || [];
}

// POST /api/find
router.post('/find', async (req, res) => {
  try {
    const query = String(req.body?.query || req.body?.message || '').trim();
    if (!query) return res.status(400).json({ error: 'query is required' });

    let parsed = { medicine: query, form: '', urgency: 'medium' };
    try {
      const ai = await askGemini(
        'Extract the medicine name, form and urgency from the message. Return ONLY JSON {"medicine": string, "form": string, "urgency": "low"|"medium"|"high"}. Never diagnose or give dosage advice.',
        query
      );
      parsed = {
        medicine: String(ai.medicine || query),
        form: String(ai.form || ''),
        urgency: ['low', 'medium', 'high'].includes(ai.urgency) ? ai.urgency : 'medium',
      };
    } catch (e) {
      console.warn('Gemini parse failed, using text search:', e.message);
    }

    let products = await searchProducts(parsed.medicine);
    if (!products.length) {
      for (const w of query.toLowerCase().split(/\W+/).filter((x) => x.length >= 4 && !STOP.has(x))) {
        products = await searchProducts(w);
        if (products.length) break;
      }
    }

    const { data: pharmacies } = await supabase.from('pharmacies').select('id, name, address, lat, lng');
    const phMap = new Map((pharmacies || []).map((p) => [p.id, p]));

    const results = products
      .map((p) => {
        const ph = phMap.get(p.pharmacy_id) || {};
        const distance =
          ph.lat != null ? haversine(CENTER.lat, CENTER.lng, Number(ph.lat), Number(ph.lng)) : 0;
        return {
          product_id: p.id,
          name: p.name,
          pharmacy: ph.name || 'Unknown pharmacy',
          address: ph.address || '',
          price: Number(p.price) || 0,
          quantity: p.quantity,
          distance_km: Math.round(distance * 10) / 10,
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 10);

    res.json({ parsed, results, disclaimer: DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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