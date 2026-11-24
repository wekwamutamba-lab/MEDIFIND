import * as sb from './supabase.js';

const supabase = sb.supabase || sb.default;

// The pharmacy's own stock rules, set on the Settings page (pharmacy_settings row id 1).
// Kept for 30 seconds so busy pages do not read the settings on every request.
export const DEFAULT_RULES = { lowStock: 20, expiryDays: 30 };
const TTL_MS = 30_000;
let cached = null;
let cachedAt = 0;

export async function getStockRules() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  try {
    const { data, error } = await supabase
      .from('pharmacy_settings')
      .select('low_stock_threshold, expiry_warning_days')
      .eq('id', 1)
      .limit(1);
    if (error) throw error;
    const row = data?.[0] || {};
    const lowStock = Number(row.low_stock_threshold);
    const expiryDays = Number(row.expiry_warning_days);
    cached = {
      lowStock: lowStock >= 1 ? lowStock : DEFAULT_RULES.lowStock,
      expiryDays: expiryDays >= 1 ? expiryDays : DEFAULT_RULES.expiryDays,
    };
  } catch (err) {
    console.error('stock rules: using defaults:', err.message);
    cached = { ...DEFAULT_RULES };
  }
  cachedAt = Date.now();
  return cached;
}

// Call after the settings change so the new rules apply straight away
export function clearStockRules() {
  cached = null;
}

export function stockStatus(quantity, rules) {
  const q = Number(quantity) || 0;
  if (q <= 0) return 'Out of Stock';
  if (q < rules.lowStock) return 'Low Stock';
  return 'In Stock';
}

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

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
