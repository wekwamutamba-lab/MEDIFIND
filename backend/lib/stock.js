import * as sb from './supabase.js';

const supabase = sb.supabase || sb.default;

// An error that carries the HTTP status a route should answer with
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Escapes % _ and \ so ilike() matches the text exactly (case-insensitive)
export const exactIlike = (text) => String(text).replace(/[\\%_]/g, (m) => `\\${m}`);

// Adds delta (negative to remove) to a product's stock without losing concurrent updates.
// The write only succeeds if the quantity is still the value we read, otherwise it re-reads
// and tries again. Throws 400 when there is not enough stock, 404 when the product is gone.
export async function adjustStock(productId, delta, { retries = 5 } = {}) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const { data: p, error } = await supabase
      .from('products')
      .select('id, name, quantity')
      .eq('id', productId)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw httpError(404, 'Product not found');

    const current = Number(p.quantity) || 0;
    const next = current + delta;
    if (next < 0) throw httpError(400, `Only ${current} units of ${p.name} in stock`);

    const { data: updated, error: ue } = await supabase
      .from('products')
      .update({ quantity: next })
      .eq('id', productId)
      .eq('quantity', p.quantity)
      .select('id');
    if (ue) throw ue;
    if (updated?.length) return { name: p.name, before: current, after: next };
  }
  throw httpError(409, 'Stock changed while saving. Please try again.');
}

// Best-effort undo used when a later step fails; logs instead of throwing
export async function restoreStock(productId, quantity) {
  try {
    await adjustStock(productId, quantity);
  } catch (e) {
    console.error(`Could not restore ${quantity} units to product ${productId}:`, e.message);
  }
}
