import * as sb from './supabase.js';
import { httpError } from './stock.js';

const supabase = sb.supabase || sb.default;

// Every pharmacy's data is kept apart by a pharmacy_id column. The backend uses the
// service_role key, which skips the database's row-level security, so this helper is
// what keeps one pharmacy from reading or changing another's rows:
//   select / update / delete only ever touch rows of this pharmacy,
//   insert always stamps this pharmacy's id (whatever the request sent).
// Routes get it as req.pharmacy (set in lib/auth.js for approved staff).
export function forPharmacy(pharmacyId) {
  if (!pharmacyId) throw httpError(403, 'Your account is not linked to a pharmacy yet.');
  const stamp = (row) => ({ ...row, pharmacy_id: pharmacyId });
  const unstamp = (vals) => {
    const { pharmacy_id, ...rest } = vals || {};
    return rest; // nobody may move a row to another pharmacy
  };
  return {
    id: pharmacyId,
    select: (table, cols = '*', opts) => supabase.from(table).select(cols, opts).eq('pharmacy_id', pharmacyId),
    insert: (table, rows) => supabase.from(table).insert(Array.isArray(rows) ? rows.map(stamp) : stamp(rows)),
    update: (table, vals) => supabase.from(table).update(unstamp(vals)).eq('pharmacy_id', pharmacyId),
    delete: (table) => supabase.from(table).delete().eq('pharmacy_id', pharmacyId),
  };
}

// Suppliers: those with no pharmacy_id are a shared directory every pharmacy can
// search; the rest belong to one pharmacy and only it can see or change them.
export const canSeeSupplier = (s, pharmacyId) => Boolean(s) && (s.pharmacy_id == null || s.pharmacy_id === pharmacyId);
export const ownsSupplier = (s, pharmacyId) => Boolean(s) && s.pharmacy_id === pharmacyId;

// True if this user may approve new pharmacy registrations (table platform_owners).
// They see the registration requests only, never another pharmacy's data.
export async function isPlatformOwner(userId) {
  if (!userId) return false;
  const { data, error } = await supabase.from('platform_owners').select('user_id').eq('user_id', userId).limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}
