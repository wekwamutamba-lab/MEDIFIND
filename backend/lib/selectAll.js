// Supabase returns at most 1,000 rows per request by default, so a plain
// select('*') silently drops everything after that. selectAll reads a whole
// table in batches until a short batch comes back.
//
// build() must return a fresh query each time, e.g.
//   selectAll(() => supabase.from('orders').select('*').order('order_date', { ascending: false }))
// A final order on id is added so rows cannot be skipped or repeated between batches.
export const BATCH = 1000;

export async function selectAll(build, { batch = BATCH, tiebreak = 'id' } = {}) {
  const rows = [];
  for (let from = 0; ; from += batch) {
    let q = build();
    if (tiebreak) q = q.order(tiebreak, { ascending: true });
    const { data, error } = await q.range(from, from + batch - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < batch) return rows;
  }
}
