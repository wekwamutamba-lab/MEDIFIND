import crypto from 'node:crypto';
import * as sb from './supabase.js';

const supabase = sb.supabase || sb.default;

// No 0/O, 1/I/L, so the code is easy to read out loud or copy from a phone
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let s = '';
  for (let i = 0; i < length; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

// "abcd-efgh 12" -> "ABCDEFGH12": staff may type it with spaces, dashes or lower case
export const cleanCode = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function settingsRow() {
  const { data, error } = await supabase.from('pharmacy_settings').select('id, join_code').eq('id', 1).limit(1);
  if (error) throw error;
  if (data?.length) return data[0];
  const { data: created, error: e2 } = await supabase
    .from('pharmacy_settings')
    .insert({ id: 1, low_stock_threshold: 20, expiry_warning_days: 30 })
    .select('id, join_code')
    .single();
  if (e2) throw e2;
  return created;
}

// The current join code. Creates one the first time it is needed.
export async function getJoinCode() {
  const row = await settingsRow();
  if (row.join_code) return row.join_code;
  return setNewJoinCode();
}

export async function setNewJoinCode() {
  await settingsRow();
  const code = newCode();
  const { error } = await supabase.from('pharmacy_settings').update({ join_code: code }).eq('id', 1);
  if (error) throw error;
  return code;
}

// True if the typed code matches the current one. Never creates a code.
export async function joinCodeMatches(typed) {
  const code = cleanCode(typed);
  if (!code) return false;
  const row = await settingsRow();
  return Boolean(row.join_code) && cleanCode(row.join_code) === code;
}
