import * as sb from './supabase.js';
import { TIME_ZONE } from './time.js';

const supabase = sb.supabase || sb.default;

// Each pharmacy's own stock rules, set on its Settings page (columns on its row in
// the pharmacies table). Kept for 30 seconds so busy pages do not read them on every request.
export const DEFAULT_RULES = { lowStock: 20, expiryDays: 30 };
const TTL_MS = 30_000;
const cache = new Map(); // pharmacy id -> { rules, at }

export async function getStockRules(pharmacyId) {
  const hit = cache.get(pharmacyId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
  let rules;
  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('low_stock_threshold, expiry_warning_days')
      .eq('id', pharmacyId)
      .limit(1);
    if (error) throw error;
    const row = data?.[0] || {};
    const lowStock = Number(row.low_stock_threshold);
    const expiryDays = Number(row.expiry_warning_days);
    rules = {
      lowStock: lowStock >= 1 ? lowStock : DEFAULT_RULES.lowStock,
      expiryDays: expiryDays >= 1 ? expiryDays : DEFAULT_RULES.expiryDays,
    };
  } catch (err) {
    console.error('stock rules: using defaults:', err.message);
    rules = { ...DEFAULT_RULES };
  }
  cache.set(pharmacyId, { rules, at: Date.now() });
  return rules;
}

// Call after a pharmacy's settings change so its new rules apply straight away
export function clearStockRules(pharmacyId) {
  cache.delete(pharmacyId);
}

export function stockStatus(quantity, rules) {
  const q = Number(quantity) || 0;
  if (q <= 0) return 'Out of Stock';
  if (q < rules.lowStock) return 'Low Stock';
  return 'In Stock';
}

// YYYY-MM-DD in the pharmacy's time zone, so a product counts as expired from
// midnight in Harare, not from midnight UTC (02:00 in Harare)
const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const isoDay = (ms) => localDay.format(new Date(ms));

// { expired, expiring_soon } for a product's expiry date (YYYY-MM-DD)
export function expiryFlags(expiryDate, rules, now = Date.now()) {
  const d = expiryDate ? String(expiryDate).slice(0, 10) : '';
  if (!d) return { expired: false, expiring_soon: false };
  const today = isoDay(now);
  const limit = isoDay(now + rules.expiryDays * 86_400_000);
  return { expired: d < today, expiring_soon: d >= today && d <= limit };
}

// Last date that still counts as "expiring soon"
export const expiryLimit = (rules, now = Date.now()) => isoDay(now + rules.expiryDays * 86_400_000);
