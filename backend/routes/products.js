import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { selectAll } from '../lib/selectAll.js';
const supabase = sb.supabase || sb.default;
const router = Router();

// normalise DB status to contract capitalised values
const normStatus = (s) => {
  const v = String(s || '').trim().toLowerCase().replace(/[-_]/g, ' ');
  if (v === 'in stock') return 'In Stock';
  if (v === 'low stock') return 'Low Stock';
  if (v === 'out of stock') return 'Out of Stock';
  return null;
};

const withStatus = (p) => ({
  ...p,
  status: p.quantity === 0 ? 'Out of Stock' : p.quantity < 20 ? 'Low Stock' : 'In Stock',
});

// GET /api/products – contract: { data, total, stats:{total,low,out}, categories:[{name,count}] }
router.get('/', async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    let q = supabase.from('vw_products_with_status').select('*', { count: 'exact' });
    if (search) q = q.ilike('name', `%${search}%`);
    if (category) q = q.eq('category', category);
    const st = normStatus(status);
    if (st) q = q.eq('status', st);
    // pagination
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    // id breaks ties between products with the same name, so pages never overlap
    q = q.order('name').order('id').range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    // stats & categories over ALL products (not only page)
    const allRows = await selectAll(() =>
      supabase.from('vw_products_with_status').select('id, category, status')
    );

    const catMap = {};
    let low = 0, out = 0;
    for (const p of allRows) {
      if (p.status === 'Low Stock') low++;
      if (p.status === 'Out of Stock') out++;
      const c = p.category || 'General';
      catMap[c] = (catMap[c] || 0) + 1;
    }

    const mappedData = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      price: p.price,
      expiry_date: p.expiry_date,
      pharmacy_id: p.pharmacy_id,
      status: p.status, // already capitalised by the view
    }));

    res.json({
      data: mappedData,
      total: count,
      stats: { total: allRows.length, low, out },
      categories: Object.entries(catMap).map(([name, n]) => ({ name, count: n })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checks the editable product fields. Returns { fields } or { error }.
// Only fields present in the body are returned, so it works for create and partial update.
function readProductFields(body = {}) {
  const fields = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return { error: 'Medicine name cannot be empty' };
    fields.name = name;
  }
  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (!Number.isInteger(q) || q < 0) return { error: 'Quantity must be a whole number, 0 or more' };
    fields.quantity = q;
  }
  if (body.price !== undefined) {
    const pr = Number(body.price);
    if (!Number.isFinite(pr) || pr < 0) return { error: 'Price must be 0 or more' };
    fields.price = Math.round(pr * 100) / 100;
  }
  if (body.category !== undefined) {
    fields.category = String(body.category || '').trim() || 'General';
  }
  if (body.expiry_date !== undefined) {
    const d = body.expiry_date ? String(body.expiry_date).slice(0, 10) : null;
    if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)))) {
      return { error: 'Expiry date must be a valid date (YYYY-MM-DD)' };
    }
    fields.expiry_date = d;
  }
  return { fields };
}

// POST /api/products – name and quantity required; price, category, expiry_date optional
router.post('/', async (req, res) => {
  try {
    if (!req.body?.name || req.body?.quantity === undefined) {
      return res.status(400).json({ error: 'name and quantity are required' });
    }
    const { fields, error: invalid } = readProductFields(req.body);
    if (invalid) return res.status(400).json({ error: invalid });

    // use the pharmacy_id sent by the client, otherwise the first pharmacy
    let pid = req.body.pharmacy_id || null;
    if (!pid) {
      const { data: ph, error: phe } = await supabase.from('pharmacies').select('id').limit(1);
      if (phe) throw phe;
      if (ph && ph.length) pid = ph[0].id;
    }

    const row = {
      category: 'General',
      price: 0,
      expiry_date: null,
      ...fields,
      pharmacy_id: pid,
    };
    const { data, error } = await supabase.from('products').insert(row).select().single();
    if (error) throw error;
    res.status(201).json(withStatus(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id – partial update, return updated product with status
router.put('/:id', async (req, res) => {
  try {
    const { fields: updates, error: invalid } = readProductFields(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });

    const { data, error } = await supabase
      .from('products').update(updates).eq('id', req.params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found' });
    res.json(withStatus(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id – contract: { ok: true }
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;