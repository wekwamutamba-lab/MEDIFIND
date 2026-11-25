import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { adjustStock, exactIlike } from '../lib/stock.js';
import { selectAll } from '../lib/selectAll.js';
import { askGemini } from '../lib/gemini.js';
import { canSeeSupplier } from '../lib/tenant.js';
import { sendError } from '../lib/errors.js';

const supabase = sb.supabase || sb.default;
const router = Router();
const CENTER = { lat: -17.8292, lng: 31.0522 };
const DISCLAIMER =
  'Supplier prices and stock are indicative. Confirm with the supplier before ordering. MediFind does not give medical advice.';
const STOP = new Set(['need', 'urgently', 'urgent', 'please', 'looking', 'want', 'have', 'with', 'some', 'from', 'supplier', 'suppliers', 'order', 'stock', 'restock', 'tablets', 'units', 'boxes', 'packs', 'running', 'low', 'find']);

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

// The shared supplier directory plus this pharmacy's own suppliers
async function visibleSuppliers(pharmacyId, cols = '*') {
  const all = await selectAll(() => supabase.from('suppliers').select(cols === '*' ? '*' : `${cols}, pharmacy_id`));
  return all.filter((s) => canSeeSupplier(s, pharmacyId));
}

async function findRows(term, supplierIds) {
  if (!supplierIds.length) return [];
  return selectAll(() =>
    supabase
      .from('supplier_products')
      .select('*')
      .in('supplier_id', supplierIds)
      .ilike('product_name', `%${term}%`)
      .gt('stock', 0)
  );
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

    const sups = await visibleSuppliers(req.pharmacy.id);
    const sMap = new Map(sups.map((s) => [s.id, s]));
    const ids = [...sMap.keys()];

    let rows = await findRows(parsed.medicine, ids);
    if (!rows.length) {
      const words = query.toLowerCase().split(/\W+/).filter((x) => x.length >= 4 && !STOP.has(x));
      for (const w of words) {
        rows = await findRows(w, ids);
        if (rows.length) break;
      }
    }

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
        // needed by the Pro "Send by WhatsApp / email" buttons on the Restock page
        whatsapp: s.whatsapp || '',
        email: s.email || '',
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
    sendError(res, err);
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

    // only a supplier this pharmacy can see (shared, or its own)
    const { data: sup, error: se } = await supabase.from('suppliers').select('id, pharmacy_id').eq('id', supplier_id).maybeSingle();
    if (se) throw se;
    if (!canSeeSupplier(sup, req.pharmacy.id)) return res.status(404).json({ error: 'Supplier not found' });

    const { data: sp, error: e1 } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_id', supplier_id)
      .ilike('product_name', product_name)
      .limit(1);
    if (e1) throw e1;
    if (!sp?.length) return res.status(404).json({ error: 'Supplier does not stock that product' });

    const total = Math.round(quantity * Number(sp[0].unit_price) * 100) / 100;
    const { data, error } = await req.pharmacy
      .insert('restock_orders', { supplier_id, product_name: sp[0].product_name, quantity, total, status: 'Ordered' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    sendError(res, err);
  }
});

// GET /api/restock
router.get('/restock', async (req, res) => {
  try {
    const [orders, suppliers] = await Promise.all([
      selectAll(() =>
        req.pharmacy.select('restock_orders', '*').order('created_at', { ascending: false })
      ),
      visibleSuppliers(req.pharmacy.id, 'id, name'),
    ]);
    const names = new Map(suppliers.map((x) => [x.id, x.name]));
    const data = orders.map((r) => ({ ...r, supplier: names.get(r.supplier_id) || 'Unknown' }));
    res.json({
      data,
      total: data.length,
      stats: {
        ordered: data.filter((r) => r.status === 'Ordered').length,
        received: data.filter((r) => r.status === 'Received').length,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
});

// PATCH /api/restock/:id/receive  -> adds the quantity to inventory
router.patch('/restock/:id/receive', async (req, res) => {
  try {
    const pharmacyId = req.pharmacy.id;
    const { data: order, error } = await req.pharmacy
      .select('restock_orders', '*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error || !order) return res.status(404).json({ error: 'Restock order not found' });
    if (order.status === 'Received') return res.json(order);

    // Find the inventory product to add the stock to (an explicit product_id wins).
    // If several products share the name, the one with the least stock gets it.
    let q = req.pharmacy.select('products', 'id, quantity');
    q = req.body?.product_id
      ? q.eq('id', req.body.product_id)
      : q.ilike('name', exactIlike(order.product_name)).order('quantity', { ascending: true });
    const { data: prods, error: pe } = await q.limit(1);
    if (pe) throw pe;
    if (!prods?.length) {
      return res.status(409).json({
        error: `"${order.product_name}" is not in your inventory yet. Add it on the Products page, then mark this order received.`,
      });
    }

    // Claim the order first: only one request can move it from its current status to
    // Received, so a double click cannot add the stock twice
    const { data: claimed, error: e2 } = await req.pharmacy
      .update('restock_orders', { status: 'Received' })
      .eq('id', order.id)
      .eq('status', order.status)
      .select();
    if (e2) throw e2;
    if (!claimed?.length) {
      const { data: current } = await req.pharmacy
        .select('restock_orders', '*').eq('id', order.id).maybeSingle();
      return res.json(current || order);
    }

    try {
      await adjustStock(prods[0].id, Number(order.quantity) || 0, { pharmacyId });
    } catch (err) {
      // Stock was not added, so put the order back to its previous status
      await req.pharmacy.update('restock_orders', { status: order.status }).eq('id', order.id);
      throw err;
    }
    res.json(claimed[0]);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;