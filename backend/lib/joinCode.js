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

// Each pharmacy has its own join code (pharmacies.join_code, unique across pharmacies).
// Staff who type it ask to join that pharmacy, and its admin approves them.

// The pharmacy's current join code. Creates one the first time it is needed.
export async function getJoinCode(pharmacyId) {
  const { data, error } = await supabase.from('pharmacies').select('join_code').eq('id', pharmacyId).limit(1);
  if (error) throw error;
  if (data?.[0]?.join_code) return data[0].join_code;
  return setNewJoinCode(pharmacyId);
}

// Makes a new code for the pharmacy; the old one stops working
export async function setNewJoinCode(pharmacyId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { error } = await supabase.from('pharmacies').update({ join_code: code }).eq('id', pharmacyId);
    if (!error) return code;
    if (!/duplicate|unique/i.test(error.message || '')) throw error; // else: taken, try another
  }
  throw new Error('Could not make a new join code. Please try again.');
}

// The id of the pharmacy whose code this is, or null. Never creates a code.
export async function pharmacyForJoinCode(typed) {
  const code = cleanCode(typed);
  if (code.length < 6) return null;
  const { data, error } = await supabase.from('pharmacies').select('id, join_code').eq('join_code', code).limit(1);
  if (error) throw error;
  return data?.[0]?.id || null;
}
