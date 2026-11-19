import { Router } from 'express';
import * as sb from '../lib/supabase.js';

const supabase = sb.supabase || sb.default;
const router = Router();

// GET /api/support  -> the logged-in user's tickets
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_email', req.user?.email || '')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/support  { subject, message }
router.post('/', async (req, res) => {
  try {
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!subject || !message) {
      return res.status(400).json({ error: 'Please fill in the subject and the message' });
    }
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({ user_email: req.user?.email || '', subject, message })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;