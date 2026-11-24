import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { isPlatformOwner } from '../lib/tenant.js';
import { setNewJoinCode } from '../lib/joinCode.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// New pharmacy registrations ("Register pharmacy" on the login page).
// Only platform owners (table platform_owners) may use these routes. They see the
// registration details below and nothing else: approving creates a separate pharmacy,
// and from then on only that pharmacy's own staff can see its data.

router.use(async (req, res, next) => {
  try {
    if (await isPlatformOwner(req.user.id)) return next();
    return res.status(403).json({ error: 'Only MediFind platform owners can do that', code: 'OWNER_ONLY' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const shape = (s) => ({
  id: s.user_id,
  email: s.email,
  full_name: s.full_name,
  pharmacy_name: s.pharmacy_name,
  license_number: s.license_number,
  whatsapp: s.whatsapp,
  address: s.address,
  status: s.status,
  created_at: s.created_at,
});

// Requests that belong to no pharmacy yet and asked to open one
const registrations = () =>
  supabase.from('staff').select('*').eq('requested_role', 'admin').is('pharmacy_id', null);

// GET /api/platform/registrations  -> { data: [...] }  waiting ones first
router.get('/registrations', async (req, res) => {
  try {
    const { data, error } = await registrations().in('status', ['pending', 'rejected']).order('created_at', { ascending: true });
    if (error) throw error;
    const rows = (data || []).map(shape);
    rows.sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function waiting(id) {
  const { data, error } = await registrations().eq('user_id', id).eq('status', 'pending').maybeSingle();
  if (error) throw error;
  return data;
}

// POST /api/platform/registrations/:id/approve
// Creates the pharmacy from the registration and makes the person its first admin.
router.post('/registrations/:id/approve', async (req, res) => {
  try {
    const reg = await waiting(req.params.id);
    if (!reg) return res.status(404).json({ error: 'That registration is not waiting any more' });

    const { data: ph, error: pe } = await supabase
      .from('pharmacies')
      .insert({
        name: reg.pharmacy_name || 'New pharmacy',
        license_number: reg.license_number,
        whatsapp: reg.whatsapp,
        address: reg.address,
        email: reg.email,
        low_stock_threshold: 20,
        expiry_warning_days: 30,
      })
      .select('id, name')
      .single();
    if (pe) throw pe;

    // only if it is still waiting and unlinked, so two clicks cannot make two pharmacies own it
    const { data: done, error: ue } = await supabase
      .from('staff')
      .update({ pharmacy_id: ph.id, role: 'admin', status: 'active', decided_by: req.user.id, decided_at: new Date().toISOString() })
      .eq('user_id', reg.user_id)
      .eq('status', 'pending')
      .is('pharmacy_id', null)
      .select('user_id');
    if (ue || !done?.length) {
      await supabase.from('pharmacies').delete().eq('id', ph.id);
      if (ue) throw ue;
      return res.status(409).json({ error: 'That registration was just handled. Reload and check.' });
    }
    await setNewJoinCode(ph.id);
    res.json({ id: reg.user_id, status: 'active', pharmacy: ph });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/platform/registrations/:id/decline
router.post('/registrations/:id/decline', async (req, res) => {
  try {
    const reg = await waiting(req.params.id);
    if (!reg) return res.status(404).json({ error: 'That registration is not waiting any more' });
    const { error } = await supabase
      .from('staff')
      .update({ status: 'rejected', decided_by: req.user.id, decided_at: new Date().toISOString() })
      .eq('user_id', reg.user_id)
      .eq('status', 'pending')
      .is('pharmacy_id', null);
    if (error) throw error;
    res.json({ id: reg.user_id, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
