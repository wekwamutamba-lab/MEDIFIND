import { useState } from 'react';
import { NotebookPen, AlertTriangle } from 'lucide-react';
import { readSaleNote } from '../lib/api';

// "Type the sale" on New Sale: the till operator types what the customer wants,
// checks each line MediFind found, and adds them to the sale. Nothing is sold
// until they press "Complete sale" as usual.
// onAdd([{ product: { id, name, price, quantity }, qty }], customerName)

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function SaleNote({ onAdd }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { customer, usedAi, lines: [{ said, options, pick, qty, check }] }

  const read = async (e) => {
    e?.preventDefault();
    if (!note.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await readSaleNote(note.trim());
      setResult({
        customer: res.customer_name || '',
        usedAi: res.used_ai,
        lines: (res.lines || []).map((l) => ({
          said: l.said,
          options: l.options || [],
          pick: l.product_id || '',
          qty: l.quantity || 1,
          check: l.check,
        })),
      });
    } catch (err) {
      setError(err.message || 'Could not read the note');
    } finally {
      setLoading(false);
    }
  };

  const change = (i, fields) =>
    setResult((r) => ({ ...r, lines: r.lines.map((l, j) => (j === i ? { ...l, ...fields } : l)) }));

  const product = (l) => l.options.find((o) => o.id === l.pick) || null;
  const ready = (result?.lines || []).filter((l) => (product(l)?.quantity || 0) > 0);

  const add = () => {
    onAdd(
      ready.map((l) => ({ product: product(l), qty: Math.max(1, Math.floor(Number(l.qty)) || 1) })),
      result.customer
    );
    setResult(null);
    setNote('');
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <NotebookPen size={16} /> Type the sale
      </div>
      <form onSubmit={read} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="e.g. 2 paracetamol and 1 amoxicillin for Tendai"
          aria-label="Type the sale"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime"
        />
        <button
          type="submit"
          disabled={loading || !note.trim()}
          className="rounded-xl bg-sidebar px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#145540] disabled:opacity-50"
        >
          {loading ? 'Reading…' : 'Read'}
        </button>
      </form>
      {!result && !error && (
        <p className="mt-2 text-xs text-gray-500">
          MediFind finds each medicine in your stock. You check every line before it goes into the sale.
        </p>
      )}
      {error && <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="mt-3 space-y-2">
          {result.lines.length === 0 && (
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              No medicines found in that note. Try something like &quot;2 paracetamol&quot;.
            </div>
          )}
          {result.lines.map((l, i) => {
            const p = product(l);
            const out = p && p.quantity <= 0;
            const over = p && !out && Number(l.qty) > p.quantity;
            const warn = !p || out || l.check;
            return (
              <div
                key={i}
                className={`rounded-xl border p-3 ${warn ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'}`}
              >
                <div className="mb-1.5 text-xs text-gray-500">
                  You typed: <span className="font-medium text-gray-700">&quot;{l.said}&quot;</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={l.pick}
                    onChange={(e) => change(i, { pick: e.target.value, check: false })}
                    aria-label={`Medicine for "${l.said}"`}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                  >
                    <option value="">Skip this line</option>
                    {l.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {money(o.price)} · {o.quantity > 0 ? `${o.quantity} in stock` : 'out of stock'}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    Qty
                    <input
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={(e) => change(i, { qty: e.target.value })}
                      className="w-16 rounded-lg border border-gray-300 py-1.5 text-center text-sm text-gray-900"
                    />
                  </label>
                </div>
                {warn && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={12} />
                    {!l.options.length
                      ? 'Not found in your products. This line will be skipped.'
                      : !p
                        ? 'Choose the medicine, or skip this line.'
                        : out
                          ? 'Out of stock. This line will be skipped.'
                          : 'More than one medicine fits. Check this is the right one.'}
                  </div>
                )}
                {over && (
                  <div className="mt-1.5 text-xs text-amber-700">Only {p.quantity} in stock, so {p.quantity} will be added.</div>
                )}
              </div>
            );
          })}

          {result.customer && (
            <div className="text-xs text-gray-600">
              Customer: <span className="font-semibold">{result.customer}</span> (you can change this below)
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={add}
              disabled={!ready.length}
              className="rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-sidebar hover:bg-[#cfe85c] disabled:opacity-50"
            >
              {ready.length ? `Add ${ready.length} to sale` : 'Nothing to add'}
            </button>
            <button
              onClick={() => setResult(null)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <span className="text-[11px] text-gray-400">
              {result.usedAi ? 'Read with AI from your own product list.' : 'Read with MediFind’s built-in rules.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
