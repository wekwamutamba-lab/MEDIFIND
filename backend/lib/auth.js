import * as sb from './supabase.js';

const supabase = sb.supabase || sb.default;

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
  next();
}