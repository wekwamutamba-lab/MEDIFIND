import { Router } from 'express';
import { getJoinCode, setNewJoinCode } from '../lib/joinCode.js';

const router = Router();

const ROLES = ['admin', 'till'];
const STATUSES = ['active', 'pending', 'suspended', 'rejected'];

// GET /api/staff  -> { join_code, staff: [...] }  (admin only, see lib/auth.js)
// Only this pharmacy's staff and its own join code.
router.get('/', async (req, res) => {
  try {
    const [{ data, error }, join_code] = await Promise.all([
      req.pharmacy.select('staff', '*').order('created_at', { ascending: true }),
      getJoinCode(req.pharmacy.id),
    ]);
    if (error) throw error;
    res.json({
      join_code,
      me: req.user.id,
      staff: (data || []).map((s) => ({
        id: s.user_id,
        email: s.email,
        full_name: s.full_name,
        role: s.role,
        status: s.status,
        requested_role: s.requested_role,
        pharmacy_name: s.pharmacy_name,
        license_number: s.license_number,
        whatsapp: s.whatsapp,
        address: s.address,
        created_at: s.created_at,
        decided_at: s.decided_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/join-code  -> { join_code }  makes a new code; the old one stops working
router.post('/join-code', async (req, res) => {
  try {
    res.json({ join_code: await setNewJoinCode(req.pharmacy.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/:id  { role?, status? }  approve, reject, suspend or change role
router.patch('/:id', async (req, res) => {
  try {
    const role = req.body?.role;
    const status = req.body?.status;
    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or till' });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status must be active, pending, suspended or rejected' });
    }
    if (role === undefined && status === undefined) {
      return res.status(400).json({ error: 'Nothing to change' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own access. Ask another admin.' });
    }

    // only people in this pharmacy (anyone else looks like they do not exist)
    const { data: row, error: re } = await req.pharmacy.select('staff', '*').eq('user_id', req.params.id).maybeSingle();
    if (re) throw re;
    if (!row) return res.status(404).json({ error: 'That person was not found' });

    const updates = { decided_by: req.user.id, decided_at: new Date().toISOString() };
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    // Never leave the pharmacy without an active admin
    const staysAdmin = (updates.role ?? row.role) === 'admin' && (updates.status ?? row.status) === 'active';
    if (row.role === 'admin' && row.status === 'active' && !staysAdmin) {
      const { count, error: ce } = await req.pharmacy
        .select('staff', 'user_id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'active');
      if (ce) throw ce;
      if ((count ?? 0) <= 1) {
        return res.status(400).json({ error: 'The pharmacy needs at least one active admin' });
      }
    }

    const { data, error } = await req.pharmacy
      .update('staff', updates)
      .eq('user_id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ id: data.user_id, role: data.role, status: data.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
