import { Router } from 'express';
import * as sb from '../lib/supabase.js';
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
    q = q.range(from, to).order('name');

    const { data, error, count } = await q;
    if (error) throw error;

    // stats & categories over ALL products (not only page)
    const { data: allRows, error: e2 } = await supabase
      .from('vw_products_with_status')
      .select('category, status');
    if (e2) throw e2;

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

// POST /api/products – contract: only name, quantity, price required
router.post('/', async (req, res) => {
  try {
    const { name, quantity, price } = req.body;
    if (!name || quantity === undefined) {
      return res.status(400).json({ error: 'name and quantity are required' });
    }
    // if no pharmacy_id supplied pick the first pharmacy
    let pid;
    const { data: ph } = await supabase.from('pharmacies').select('id').limit(1);
    if (ph && ph.length) pid = ph[0].id;

    const row = {
      name,
      category: 'General',
      quantity: Number(quantity),
      price: Number(price) || 0,
      expiry_date: null,
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
    const { name, quantity, price } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (price !== undefined) updates.price = Number(price);
    const { data, error } = await supabase
      .from('products').update(updates).eq('id', req.params.id).select().single();
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