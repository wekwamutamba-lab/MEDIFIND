import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { selectAll } from '../lib/selectAll.js';
import { canSeeSupplier, ownsSupplier } from '../lib/tenant.js';
import { sendError } from '../lib/errors.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// Suppliers with no pharmacy_id are the shared directory: every pharmacy sees them,
// nobody can change them from the app. Suppliers a pharmacy adds are its own: only
// it can see, edit or delete them and their catalogue.

const FIELDS = ['name', 'address', 'phone', 'whatsapp', 'email', 'delivery_hours', 'notes'];
const pick = (body) => {
  const out = {};
  for (const k of FIELDS) if (body?.[k] !== undefined) out[k] = body[k];
  if (out.delivery_hours !== undefined) out.delivery_hours = Number(out.delivery_hours) || 24;
  return out;
};

async function getSupplier(id) {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// Loads the supplier and checks this pharmacy may see it (or change it, with own = true).
// Sends the error response and returns null when it may not.
async function supplierFor(req, res, { own = false } = {}) {
  const s = await getSupplier(req.params.id);
  if (!canSeeSupplier(s, req.pharmacy.id)) {
    res.status(404).json({ error: 'Supplier not found' });
    return null;
  }
  if (own && !ownsSupplier(s, req.pharmacy.id)) {
    res.status(403).json({ error: 'This supplier is in the shared directory and cannot be changed. Add your own supplier instead.', code: 'SHARED_SUPPLIER' });
    return null;
  }
  return s;
}

const shape = (s, pharmacyId, count) => {
  const { pharmacy_id, ...rest } = s;
  return { ...rest, shared: pharmacy_id == null, own: pharmacy_id === pharmacyId, product_count: count };
};

// GET /api/suppliers?search=
router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const suppliers = (await selectAll(() => supabase.from('suppliers').select('*').order('name')))
      .filter((s) => canSeeSupplier(s, req.pharmacy.id));
    const ids = suppliers.map((s) => s.id);
    const products = ids.length
      ? await selectAll(() => supabase.from('supplier_products').select('id, supplier_id').in('supplier_id', ids))
      : [];
    const counts = new Map();
    for (const r of products) counts.set(r.supplier_id, (counts.get(r.supplier_id) || 0) + 1);

    let rows = suppliers.map((x) => shape(x, req.pharmacy.id, counts.get(x.id) || 0));
    if (search) {
      rows = rows.filter(
        (x) =>
          (x.name || '').toLowerCase().includes(search) ||
          (x.address || '').toLowerCase().includes(search)
      );
    }
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/suppliers  -> a new supplier of this pharmacy's own
router.post('/', async (req, res) => {
  try {
    const row = pick(req.body);
    if (!row.name || !String(row.name).trim()) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }
    const { data, error } = await req.pharmacy.insert('suppliers', row).select().single();
    if (error) throw error;
    res.status(201).json(shape(data, req.pharmacy.id, 0));
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /api/suppliers/:id  (own suppliers only)
router.put('/:id', async (req, res) => {
  try {
    if (!(await supplierFor(req, res, { own: true }))) return;
    const { data, error } = await req.pharmacy
      .update('suppliers', pick(req.body)).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(shape(data, req.pharmacy.id, undefined));
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/suppliers/:id  (own suppliers only)
router.delete('/:id', async (req, res) => {
  try {
    if (!(await supplierFor(req, res, { own: true }))) return;
    const { error } = await req.pharmacy.delete('suppliers').eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

// GET /api/suppliers/:id/products
router.get('/:id/products', async (req, res) => {
  try {
    if (!(await supplierFor(req, res))) return;
    const { data, error } = await supabase
      .from('supplier_products').select('*').eq('supplier_id', req.params.id).order('product_name');
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/suppliers/:id/products  (own suppliers only)
router.post('/:id/products', async (req, res) => {
  try {
    if (!(await supplierFor(req, res, { own: true }))) return;
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
    sendError(res, err);
  }
});

// DELETE /api/suppliers/:id/products/:pid  (own suppliers only)
router.delete('/:id/products/:pid', async (req, res) => {
  try {
    if (!(await supplierFor(req, res, { own: true }))) return;
    const { error } = await supabase
      .from('supplier_products').delete().eq('id', req.params.pid).eq('supplier_id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
