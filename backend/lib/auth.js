import * as sb from './supabase.js';

const supabase = sb.supabase || sb.default;

// Checks the login token and loads the person's staff record (role and status).
// req.user  = the Supabase user
// req.staff = their row in the staff table, or null if they have not asked to join yet
export async function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS') return next();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in to continue' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Session expired. Please log in again' });
  }
  req.user = data.user;

  try {
    const { data: rows, error: se } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', data.user.id)
      .limit(1);
    if (se) throw se;
    req.staff = rows?.[0] || null;
  } catch (err) {
    return res.status(500).json({ error: `Could not check your access: ${err.message}` });
  }
  next();
}

const BLOCKED = {
  none: 'Your account is not linked to a pharmacy yet.',
  pending: 'Your account is waiting for approval from your pharmacy admin.',
  rejected: 'Your request to join was declined. Speak to your pharmacy admin.',
  suspended: 'Your account has been suspended. Speak to your pharmacy admin.',
};

// Only approved (active) staff get past this point
export function requireActive(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const status = req.staff?.status || 'none';
  if (status === 'active') return next();
  return res.status(403).json({ error: BLOCKED[status] || BLOCKED.none, code: `ACCESS_${status.toUpperCase()}` });
}

// What a till operator (cashier) may do. Everything else is admin only.
// Paths are relative to /api.
const TILL_ALLOWED = [
  ['GET', /^\/products\/?$/], // product and stock lookup
  ['GET', /^\/customers\/?$/], // customer lookup
  ['GET', /^\/orders\/?$/], // their own sales (filtered in routes/orders.js)
  ['POST', /^\/orders\/?$/],
  ['POST', /^\/pos\/checkout\/?$/], // New Sale
  ['GET', /^\/support\/?$/],
  ['POST', /^\/support\/?$/],
];

export const isAdmin = (req) => req.staff?.role === 'admin';

// Lets admins through; lets till operators through only for the routes above
export function enforceRole(req, res, next) {
  if (req.method === 'OPTIONS' || isAdmin(req)) return next();
  const ok = TILL_ALLOWED.some(([m, re]) => m === req.method && re.test(req.path));
  if (ok) return next();
  return res.status(403).json({ error: 'Only a pharmacy admin can do that', code: 'ADMIN_ONLY' });
}

// Name to show for the person who made a sale
export const staffName = (req) =>
  req.staff?.full_name || req.user?.user_metadata?.full_name || req.user?.email || 'Staff';
