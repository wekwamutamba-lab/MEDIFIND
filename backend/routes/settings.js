import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { clearStockRules } from '../lib/stockRules.js';

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

async function load() {
  const { data, error } = await supabase.from('pharmacy_settings').select('*').eq('id', 1).limit(1);
  if (error) throw error;
  if (data?.length) return data[0];
  const { data: created, error: e2 } = await supabase
    .from('pharmacy_settings')
    .insert({ id: 1, low_stock_threshold: 20, expiry_warning_days: 30 })
    .select()
    .single();
  if (e2) throw e2;
  return created;
}

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    res.json(await load());
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    await load(); // make sure the row exists
    const { data, error } = await supabase
      .from('pharmacy_settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    clearStockRules(); // new low-stock and expiry rules apply straight away
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;