import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { pharmacyForJoinCode } from '../lib/joinCode.js';
import { isPlatformOwner } from '../lib/tenant.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

const publicStaff = (s) =>
  s && {
    role: s.role,
    status: s.status,
    requested_role: s.requested_role,
    full_name: s.full_name,
    created_at: s.created_at,
  };

// { user, staff, pharmacy, platform_owner }
// pharmacy: the pharmacy this person works at (null until they are linked to one).
// platform_owner: may approve new pharmacy registrations (Staff page).
async function me(req) {
  let pharmacy = null;
  if (req.staff?.pharmacy_id) {
    const { data } = await supabase.from('pharmacies').select('id, name').eq('id', req.staff.pharmacy_id).limit(1);
    pharmacy = data?.[0] ? { id: data[0].id, name: data[0].name } : null;
  }
  const active = req.staff?.status === 'active';
  return {
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.staff?.full_name || req.user.user_metadata?.full_name || '',
    },
    staff: publicStaff(req.staff),
    pharmacy,
    platform_owner: active && req.staff.role === 'admin' ? await isPlatformOwner(req.user.id) : false,
  };
}

// Creates a pending staff request.
//   role 'till'  = joined with a pharmacy's code: waits for THAT pharmacy's admin (pharmacyId).
//   role 'admin' = registered a new pharmacy: belongs to no pharmacy yet and waits for a
//                  platform owner, who creates the pharmacy when approving it.
async function createRequest(req, role, extra = {}, pharmacyId = null) {
  const row = {
    user_id: req.user.id,
    pharmacy_id: role === 'till' ? pharmacyId : null,
    email: req.user.email,
    full_name: clean(extra.full_name || req.user.user_metadata?.full_name) || null,
    role,
    requested_role: role,
    status: 'pending',
    pharmacy_name: clean(extra.pharmacy_name) || null,
    license_number: clean(extra.license_number) || null,
    whatsapp: clean(extra.whatsapp) || null,
    address: clean(extra.address, 300) || null,
  };
  // ignoreDuplicates: if a request already exists (e.g. two tabs), keep the first one
  const { error } = await supabase.from('staff').upsert(row, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
  const { data, error: e2 } = await supabase.from('staff').select('*').eq('user_id', req.user.id).single();
  if (e2) throw e2;
  req.staff = data;
}

function checkPharmacy(b) {
  if (!clean(b.pharmacy_name)) return 'Please enter the pharmacy name';
  if (!clean(b.license_number)) return 'Please enter the pharmacy licence number';
  const digits = clean(b.whatsapp).replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return 'The WhatsApp number must have 9 to 15 digits';
  if (!clean(b.address, 300)) return 'Please enter the pharmacy address';
  return null;
}

// GET /api/me  -> { user, staff }
// staff is null when the person has not asked to join yet. If they signed up with the
// sign-up form, their request is created here from what they typed then.
router.get('/', async (req, res) => {
  try {
    if (!req.staff) {
      const md = req.user.user_metadata || {};
      if (md.signup_type === 'register' && !checkPharmacy(md)) {
        await createRequest(req, 'admin', md);
      } else if (md.signup_type === 'join') {
        const pharmacyId = await pharmacyForJoinCode(md.join_code);
        if (pharmacyId) await createRequest(req, 'till', md, pharmacyId);
      }
    }
    res.json(await me(req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const alreadyAsked = (req, res) => {
  if (!req.staff) return false;
  res.status(409).json({
    error:
      req.staff.status === 'pending'
        ? 'You have already asked to join. Your pharmacy admin needs to approve you.'
        : 'Your account already has a request. Speak to your pharmacy admin.',
  });
  return true;
};

// POST /api/me/join  { join_code, full_name? }  -> ask to join as a till operator
router.post('/join', async (req, res) => {
  try {
    if (alreadyAsked(req, res)) return;
    const pharmacyId = await pharmacyForJoinCode(req.body?.join_code);
    if (!pharmacyId) {
      return res.status(400).json({ error: 'That join code is not right. Ask your pharmacy admin for the current code.' });
    }
    await createRequest(req, 'till', req.body || {}, pharmacyId);
    res.status(201).json(await me(req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/me/register  { pharmacy_name, license_number, whatsapp, address, full_name? }
// -> ask to open a new pharmacy. A platform owner approves it, which creates the pharmacy
//    and makes this person its admin. Until then they belong to no pharmacy.
router.post('/register', async (req, res) => {
  try {
    if (alreadyAsked(req, res)) return;
    const invalid = checkPharmacy(req.body || {});
    if (invalid) return res.status(400).json({ error: invalid });
    await createRequest(req, 'admin', req.body);
    res.status(201).json(await me(req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
