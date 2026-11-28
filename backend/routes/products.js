import { Router } from 'express';
import { selectAll } from '../lib/selectAll.js';
import { getStockRules, stockStatus, expiryFlags } from '../lib/stockRules.js';
import { sendError } from '../lib/errors.js';
import { isAdmin } from '../lib/auth.js';
import { missingColumn } from '../lib/data.js';
const router = Router();

// Products are saved with a cost price once migration_cost_price.sql has been run.
// Before that the column is missing: a product without a cost price is still saved,
// and one with a cost price gets a clear message instead of a server error.
const NEEDS_COST_SQL =
  'The cost price cannot be saved yet. In Supabase, run backend/supabase/migration_cost_price.sql once, then save again.';

async function saveProduct(run, fields) {
  const first = await run(fields);
  if (!missingColumn(first.error, 'cost_price')) return first;
  if (fields.cost_price != null) return { error: { status: 400, message: NEEDS_COST_SQL } };
  const { cost_price: _skip, ...rest } = fields;
  return run(rest);
}

// normalise DB status to contract capitalised values
const normStatus = (s) => {
  const v = String(s || '').trim().toLowerCase().replace(/[-_]/g, ' ');
  if (v === 'in stock') return 'In Stock';
  if (v === 'low stock') return 'Low Stock';
  if (v === 'out of stock') return 'Out of Stock';
  return null;
};

// Status and expiry flags use the pharmacy's own rules from the Settings page
const withStatus = (p, rules) => ({
  ...p,
  status: stockStatus(p.quantity, rules),
  ...expiryFlags(p.expiry_date, rules),
});

// GET /api/products – contract: { data, total, stats:{total,low,out}, categories:[{name,count}] }
router.get('/', async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const rules = await getStockRules(req.pharmacy.id);
    let q = req.pharmacy.select('vw_products_with_status', '*', { count: 'exact' });
    if (search) q = q.ilike('name', `%${search}%`);
    if (category) q = q.eq('category', category);
    // filter on quantity, so the pharmacy's own low-stock level applies
    const st = normStatus(status);
    if (st === 'Out of Stock') q = q.lte('quantity', 0);
    if (st === 'Low Stock') q = q.gt('quantity', 0).lt('quantity', rules.lowStock);
    if (st === 'In Stock') q = q.gte('quantity', rules.lowStock);
    // pagination
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    // id breaks ties between products with the same name, so pages never overlap
    q = q.order('name').order('id').range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    // stats & categories over ALL products (not only page)
    const allRows = await selectAll(() =>
      req.pharmacy.select('vw_products_with_status', 'id, category, quantity')
    );

    const catMap = {};
    let low = 0, out = 0;
    for (const p of allRows) {
      const s = stockStatus(p.quantity, rules);
      if (s === 'Low Stock') low++;
      if (s === 'Out of Stock') out++;
      const c = p.category || 'General';
      catMap[c] = (catMap[c] || 0) + 1;
    }

    const mappedData = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      price: p.price,
      // what the pharmacy pays: admins only, till operators do not see it
      ...(isAdmin(req) ? { cost_price: p.cost_price ?? null } : {}),
      expiry_date: p.expiry_date,
      pharmacy_id: p.pharmacy_id,
      ...withStatus({ quantity: p.quantity, expiry_date: p.expiry_date }, rules),
    }));

    res.json({
      data: mappedData,
      total: count,
      stats: { total: allRows.length, low, out },
      categories: Object.entries(catMap).map(([name, n]) => ({ name, count: n })),
    });
  } catch (err) {
    sendError(res, err);
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
  if (body.cost_price !== undefined) {
    // empty means "not set"; profit then leaves this product's sales out
    if (body.cost_price === null || String(body.cost_price).trim() === '') {
      fields.cost_price = null;
    } else {
      const c = Number(body.cost_price);
      if (!Number.isFinite(c) || c < 0) return { error: 'Cost price must be 0 or more' };
      fields.cost_price = Math.round(c * 100) / 100;
    }
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

// POST /api/products – name and quantity required; price, cost_price, category, expiry_date optional
router.post('/', async (req, res) => {
  try {
    if (!req.body?.name || req.body?.quantity === undefined) {
      return res.status(400).json({ error: 'name and quantity are required' });
    }
    const { fields, error: invalid } = readProductFields(req.body);
    if (invalid) return res.status(400).json({ error: invalid });

    // always the logged-in person's pharmacy (any pharmacy_id sent is ignored)
    const row = {
      category: 'General',
      price: 0,
      expiry_date: null,
      ...fields,
    };
    const { data, error } = await saveProduct(
      (r) => req.pharmacy.insert('products', r).select().single(),
      row
    );
    if (error) throw error;
    res.status(201).json(withStatus(data, await getStockRules(req.pharmacy.id)));
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /api/products/:id – partial update, return updated product with status
router.put('/:id', async (req, res) => {
  try {
    const { fields: updates, error: invalid } = readProductFields(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });

    const { data, error } = await saveProduct(
      (u) => req.pharmacy.update('products', u).eq('id', req.params.id).select().maybeSingle(),
      updates
    );
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found' });
    res.json(withStatus(data, await getStockRules(req.pharmacy.id)));
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/products/:id – contract: { ok: true }
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await req.pharmacy.delete('products').eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;