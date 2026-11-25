import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { clearStockRules } from '../lib/stockRules.js';
import { httpError } from '../lib/stock.js';
import { sendError } from '../lib/errors.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const TEXT = [
  'pharmacy_name',
  'pharmacist_name',
  'phone',
  'whatsapp',
  'email',
  'address',
  'city',
  'license_number',
  'message_footer',
];

// Each pharmacy's settings are columns on its own row in the pharmacies table.
// The API keeps the name pharmacy_name for the column 'name'.
const COLS = 'id, name, pharmacist_name, phone, whatsapp, email, address, city, license_number, message_footer, low_stock_threshold, expiry_warning_days, updated_at';
const toApi = (r) => {
  const { name, ...rest } = r || {};
  return { ...rest, pharmacy_name: name ?? '' };
};

async function load(pharmacyId) {
  const { data, error } = await supabase.from('pharmacies').select(COLS).eq('id', pharmacyId).limit(1);
  if (error) throw error;
  if (!data?.length) throw httpError(404, 'Your pharmacy was not found');
  return data[0];
}

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    res.json(toApi(await load(req.pharmacy.id)));
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const body = req.body || {};
    const updates = { updated_at: new Date().toISOString() };

    for (const k of TEXT) {
      if (body[k] !== undefined) {
        updates[k] = String(body[k]).trim().slice(0, k === 'message_footer' ? 500 : 200);
      }
    }

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return res.status(400).json({ error: 'That email address does not look right' });
    }
    for (const k of ['phone', 'whatsapp']) {
      if (updates[k]) {
        const digits = updates[k].replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 15) {
          return res.status(400).json({
            error: `The ${k === 'phone' ? 'phone' : 'WhatsApp'} number must have 9 to 15 digits`,
          });
        }
      }
    }

    if (body.low_stock_threshold !== undefined) {
      const n = Math.floor(Number(body.low_stock_threshold));
      if (!(n >= 1 && n <= 10000)) {
        return res.status(400).json({ error: 'Low stock level must be between 1 and 10000' });
      }
      updates.low_stock_threshold = n;
    }
    if (body.expiry_warning_days !== undefined) {
      const n = Math.floor(Number(body.expiry_warning_days));
      if (!(n >= 1 && n <= 365)) {
        return res.status(400).json({ error: 'Expiry warning must be between 1 and 365 days' });
      }
      updates.expiry_warning_days = n;
    }

    // the column is called name; a pharmacy always keeps a name
    if (updates.pharmacy_name !== undefined) {
      if (!updates.pharmacy_name) return res.status(400).json({ error: 'The pharmacy name cannot be empty' });
      updates.name = updates.pharmacy_name;
      delete updates.pharmacy_name;
    }

    const { data, error } = await supabase
      .from('pharmacies')
      .update(updates)
      .eq('id', req.pharmacy.id)
      .select(COLS)
      .single();
    if (error) throw error;
    clearStockRules(req.pharmacy.id); // new low-stock and expiry rules apply straight away
    res.json(toApi(data));
  } catch (err) {
    sendError(res, err);
  }
});

export default router;