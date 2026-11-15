import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as sb from '../lib/supabase.js';

const supabase = sb.supabase || sb.default;
const router = Router();
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const CENTER = { lat: -17.8292, lng: 31.0522 };
const DISCLAIMER =
  'Supplier prices and stock are indicative. Confirm with the supplier before ordering. MediFind does not give medical advice.';
const STOP = new Set(['need', 'urgently', 'urgent', 'please', 'looking', 'want', 'have', 'with', 'some', 'from', 'supplier', 'suppliers', 'order', 'stock', 'restock', 'tablets', 'units', 'boxes', 'packs', 'running', 'low', 'find']);

async function askGemini(system, text) {
  if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: system });
  const out = await model.generateContent(text);
  return JSON.parse(out.response.text().replace(/```json|```/g, '').trim());
}

function haversine(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fallbackParse(query) {
  const num = (query.match(/\d+/) || [])[0];
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length >= 4 && !STOP.has(w));
  return {
    medicine: words[0] || query,
    quantity: num ? Number(num) : 50,
    urgency: /urgent|asap|now|emergency|out of stock/i.test(query) ? 'high' : 'medium',
  };
}

async function findRows(term) {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .ilike('product_name', `%${term}%`)
    .gt('stock', 0);
  if (error) throw error;
  return data || [];
}

// POST /api/find  { query }  -> suppliers that can supply the medicine
router.post('/find', async (req, res) => {
  try {
    const query = String(req.body?.query || req.body?.message || '').trim();
    if (!query) return res.status(400).json({ error: 'query is required' });

    let parsed = fallbackParse(query);
    try {
      const ai = await askGemini(
        'A pharmacist is looking for a supplier. Extract the medicine name, quantity needed and urgency from the message. Return ONLY JSON {"medicine": string, "quantity": number, "urgency": "low"|"medium"|"high"}. Never give medical advice.',
        query
      );
      parsed = {
        medicine: String(ai.medicine || parsed.medicine),
        quantity: Number(ai.quantity) > 0 ? Number(ai.quantity) : parsed.quantity,
        urgency: ['low', 'medium', 'high'].includes(ai.urgency) ? ai.urgency : parsed.urgency,
      };
    } catch (e) {
      console.warn('Gemini parse failed, using keyword parsing:', e.message);
    }

    let rows = await findRows(parsed.medicine);
    if (!rows.length) {
      const words = query.toLowerCase().split(/\W+/).filter((x) => x.length >= 4 && !STOP.has(x));
      for (const w of words) {
        rows = await findRows(w);
        if (rows.length) break;
      }
    }

    const { data: sups } = await supabase.from('suppliers').select('*');
    const sMap = new Map((sups || []).map((s) => [s.id, s]));

    const results = rows.map((r) => {
      const s = sMap.get(r.supplier_id) || {};
      const km =
        s.lat != null ? haversine(CENTER.lat, CENTER.lng, Number(s.lat), Number(s.lng)) : 0;
      const price = Number(r.unit_price) || 0;
      return {
        supplier_id: r.supplier_id,
        supplier: s.name || 'Unknown supplier',
        address: s.address || '',
        phone: s.phone || '',
        product_name: r.product_name,
        unit_price: price,
        stock: r.stock,
        can_fulfil: r.stock >= parsed.quantity,
        delivery_hours: s.delivery_hours ?? 24,
        distance_km: Math.round(km * 10) / 10,
        est_total: Math.round(price * parsed.quantity * 100) / 100,
      };
    });

    results.sort((a, b) =>
      parsed.urgency === 'high'
        ? a.delivery_hours - b.delivery_hours || a.unit_price - b.unit_price
        : a.unit_price - b.unit_price
    );

    res.json({ parsed, results: results.slice(0, 10), disclaimer: DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/restock  { supplier_id, product_name, quantity }
router.post('/restock', async (req, res) => {
  try {
    const { supplier_id, product_name } = req.body || {};
    const quantity = Math.max(parseInt(req.body?.quantity) || 0, 1);
    if (!supplier_id || !product_name) {
      return res.status(400).json({ error: 'supplier_id and product_name are required' });
    }

    const { data: sp, error: e1 } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_id', supplier_id)
      .ilike('product_name', product_name)
      .limit(1);
    if (e1) throw e1;
    if (!sp?.length) return res.status(404).json({ error: 'Supplier does not stock that product' });

    const total = Math.round(quantity * Number(sp[0].unit_price) * 100) / 100;
    const { data, error } = await supabase
      .from('restock_orders')
      .insert({ supplier_id, product_name: sp[0].product_name, quantity, total, status: 'Ordered' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/restock
router.get('/restock', async (req, res) => {
  try {
    const [o, s] = await Promise.all([
      supabase.from('restock_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('id, name'),
    ]);
    if (o.error) throw o.error;
    const names = new Map((s.data || []).map((x) => [x.id, x.name]));
    const data = o.data.map((r) => ({ ...r, supplier: names.get(r.supplier_id) || 'Unknown' }));
    res.json({
      data,
      total: data.length,
      stats: {
        ordered: data.filter((r) => r.status === 'Ordered').length,
        received: data.filter((r) => r.status === 'Received').length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/restock/:id/receive  -> adds the quantity to inventory
router.patch('/restock/:id/receive', async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('restock_orders')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !order) return res.status(404).json({ error: 'Restock order not found' });
    if (order.status === 'Received') return res.json(order);

    const { data: prods } = await supabase
      .from('products')
      .select('id, quantity')
      .ilike('name', order.product_name)
      .order('quantity', { ascending: true })
      .limit(1);
    if (prods?.length) {
      await supabase
        .from('products')
        .update({ quantity: (prods[0].quantity || 0) + order.quantity })
        .eq('id', prods[0].id);
    }

    const { data: updated, error: e2 } = await supabase
      .from('restock_orders')
      .update({ status: 'Received' })
      .eq('id', order.id)
      .select()
      .single();
    if (e2) throw e2;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;