import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { selectAll } from '../lib/selectAll.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const FIELDS = ['name', 'address', 'phone', 'whatsapp', 'email', 'delivery_hours', 'notes'];
const pick = (body) => {
  const out = {};
  for (const k of FIELDS) if (body?.[k] !== undefined) out[k] = body[k];
  if (out.delivery_hours !== undefined) out.delivery_hours = Number(out.delivery_hours) || 24;
  return out;
};

// GET /api/suppliers?search=
router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const [suppliers, products] = await Promise.all([
      selectAll(() => supabase.from('suppliers').select('*').order('name')),
      selectAll(() => supabase.from('supplier_products').select('id, supplier_id')),
    ]);
    const counts = new Map();
    for (const r of products) counts.set(r.supplier_id, (counts.get(r.supplier_id) || 0) + 1);

    let rows = suppliers.map((x) => ({ ...x, product_count: counts.get(x.id) || 0 }));
    if (search) {
      rows = rows.filter(
        (x) =>
          (x.name || '').toLowerCase().includes(search) ||
          (x.address || '').toLowerCase().includes(search)
      );
    }
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  try {
    const row = pick(req.body);
    if (!row.name || !String(row.name).trim()) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }
    const { data, error } = await supabase.from('suppliers').insert(row).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers').update(pick(req.body)).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('suppliers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id/products
router.get('/:id/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('supplier_products').select('*').eq('supplier_id', req.params.id).order('product_name');
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers/:id/products
router.post('/:id/products', async (req, res) => {
  try {
    const { product_name, category, unit_price, stock } = req.body || {};
    if (!product_name || !String(product_name).trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    const { data, error } = await supabase
      .from('supplier_products')
      .insert({
        supplier_id: req.params.id,
        product_name: String(product_name).trim(),
        category: category || 'General',
        unit_price: Number(unit_price) || 0,
        stock: Math.max(parseInt(stock) || 0, 0),
      })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id/products/:pid
router.delete('/:id/products/:pid', async (req, res) => {
  try {
    const { error } = await supabase
      .from('supplier_products').delete().eq('id', req.params.pid).eq('supplier_id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;