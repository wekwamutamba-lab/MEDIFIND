import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X, MessageCircle, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  findSuppliers,
  placeRestockOrder,
  getRestockOrders,
  receiveRestock,
} from '../lib/api';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const urgencyStyle = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-green-100 text-green-700',
};

// Turns 0771234567 or +263 77 123 4567 into 263771234567 for wa.me links
const waNumber = (raw) => {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '263' + d.slice(1);
  return d;
};

export default function Restock() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [isPro, setIsPro] = useState(false);
  const [sender, setSender] = useState('a MediFind pharmacy');

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [parsed, setParsed] = useState({});
  const [results, setResults] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [message, setMessage] = useState('');
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setIsPro(u?.user_metadata?.plan === 'pro');
      setSender(u?.user_metadata?.full_name || u?.email || 'a MediFind pharmacy');
    });
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await getRestockOrders();
      setOrders(res?.data ?? []);
      setStats(res?.stats ?? {});
    } catch (e) {
      setOrdersError(e.message || 'Failed to load restock orders');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const runSearch = useCallback(async (text) => {
    const q = String(text || '').trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setMessage('');
    setLastOrder(null);
    try {
      const res = await findSuppliers(q);
      setParsed(res?.parsed ?? {});
      setResults(res?.results ?? []);
      setDisclaimer(res?.disclaimer ?? '');
      setSearched(true);
    } catch (e) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const q = params.get('q');
    if (q) {
      setQuery(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openOrder = (r) => {
    setSelected(r);
    setQty(Number(parsed?.quantity) > 0 ? Number(parsed.quantity) : 1);
  };

  const confirmOrder = async () => {
    if (!selected) return;
    setOrdering(true);
    setError('');
    const quantity = Number(qty) || 1;
    try {
      await placeRestockOrder({
        supplier_id: selected.supplier_id,
        product_name: selected.product_name,
        quantity,
      });
      setLastOrder({
        ...selected,
        qty: quantity,
        total: quantity * Number(selected.unit_price || 0),
      });
      setMessage('');
      setSelected(null);
      await loadOrders();
    } catch (e) {
      setError(e.message || 'Could not place the order');
    } finally {
      setOrdering(false);
    }
  };

  const markReceived = async (id) => {
    setOrdersError('');
    try {
      await receiveRestock(id);
      setMessage('Stock updated. The quantity was added to your inventory.');
      await loadOrders();
    } catch (e) {
      setOrdersError(e.message || 'Could not mark as received');
    }
  };

  const buildMessage = (o) =>
    `Hello ${o.supplier},\n\nThis is ${sender}. I would like to place a restock order through MediFind:\n\n- Medicine: ${o.product_name}\n- Quantity: ${o.qty}\n- Unit price: ${money(o.unit_price)}\n- Estimated total: ${money(o.total)}\n\nPlease confirm availability and delivery time.\n\nThank you.`;

  const waTarget = lastOrder ? waNumber(lastOrder.whatsapp || lastOrder.phone) : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F3D2E]">Source Stock</h1>
        <p className="text-sm text-gray-500">Tell Pill what you need and compare suppliers</p>
      </div>

      {/* Search box */}
      <div className="rounded-2xl bg-[#0F3D2E] p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
              placeholder="What do you need to restock? e.g. 200 amoxicillin urgently"
              className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D9F26B]"
            />
          </div>
          <button
            onClick={() => runSearch(query)}
            disabled={loading}
            className="rounded-xl bg-[#D9F26B] px-6 py-3 text-sm font-semibold text-[#0F3D2E] hover:bg-[#cfe85c] disabled:opacity-60"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => runSearch(query)}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* After an order: contact the supplier */}
      {lastOrder && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="font-semibold text-green-900">
            Order recorded: {lastOrder.qty} x {lastOrder.product_name} from {lastOrder.supplier}
          </div>
          <p className="mt-1 text-sm text-green-800">
            Estimated total {money(lastOrder.total)}. Now let the supplier know.
          </p>

          {isPro ? (
            <div className="mt-4 space-y-3">
              <textarea
                readOnly
                rows={8}
                value={buildMessage(lastOrder)}
                className="w-full rounded-xl border border-green-200 bg-white p-3 text-xs text-gray-700"
              />
              <div className="flex flex-wrap gap-2">
                {waTarget && (
                  <a
                    href={`https://wa.me/${waTarget}?text=${encodeURIComponent(
                      buildMessage(lastOrder)
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <MessageCircle size={16} /> Send on WhatsApp
                  </a>
                )}
                {lastOrder.email && (
                  <a
                    href={`mailto:${lastOrder.email}?subject=${encodeURIComponent(
                      `Restock order: ${lastOrder.qty} x ${lastOrder.product_name}`
                    )}&body=${encodeURIComponent(buildMessage(lastOrder))}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D2E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#145540]"
                  >
                    <Mail size={16} /> Send by email
                  </a>
                )}
                {!waTarget && !lastOrder.email && (
                  <p className="text-sm text-gray-600">
                    This supplier has no WhatsApp number or email yet. Add one on the Suppliers
                    page.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Lock size={18} className="shrink-0 text-gray-400" />
                Sending the order to the supplier with one tap (WhatsApp or email) is a Pro
                feature.
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="rounded-xl bg-[#D9F26B] px-4 py-2 text-sm font-semibold text-[#0F3D2E] hover:bg-[#cfe85c]"
              >
                Upgrade to Pro
              </button>
            </div>
          )}

          <button
            onClick={() => setLastOrder(null)}
            className="mt-3 text-xs text-green-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* AI understood chips */}
      {searched && !loading && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Understood by AI
          </span>
          {parsed?.medicine && (
            <span className="rounded-full bg-[#0F3D2E] px-3 py-1 text-xs font-medium text-white">
              {parsed.medicine}
            </span>
          )}
          {parsed?.quantity && (
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700">
              Qty {parsed.quantity}
            </span>
          )}
          {parsed?.urgency && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                urgencyStyle[parsed.urgency] || urgencyStyle.medium
              }`}
            >
              {parsed.urgency} urgency
            </span>
          )}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
          No suppliers found for that medicine. Try another name.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((r, i) => (
            <div
              key={`${r.supplier_id}-${r.product_name}`}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-[#0F3D2E]">{r.supplier}</div>
                  <div className="text-xs text-gray-500">{r.address}</div>
                  <div className="text-xs text-gray-500">{r.phone}</div>
                </div>
                {i === 0 && (
                  <span className="shrink-0 rounded-full bg-[#D9F26B] px-2 py-1 text-[10px] font-bold text-[#0F3D2E]">
                    Best match
                  </span>
                )}
              </div>

              <div className="my-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-gray-400">Unit price</div>
                  <div className="font-semibold">{money(r.unit_price)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">In stock</div>
                  <div className="font-semibold">{r.stock}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Delivery</div>
                  <div className="font-semibold">Delivers in {r.delivery_hours}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Distance</div>
                  <div className="font-semibold">{r.distance_km} km away</div>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Est. total <b className="text-gray-900">{money(r.est_total)}</b>
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    r.can_fulfil
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {r.can_fulfil ? 'Can fulfil' : 'Partial stock'}
                </span>
              </div>

              <button
                onClick={() => openOrder(r)}
                className="mt-auto rounded-xl bg-[#0F3D2E] py-2 text-sm font-semibold text-white hover:bg-[#145540]"
              >
                Order
              </button>
            </div>
          ))}
        </div>
      )}

      {disclaimer && !loading && results.length > 0 && (
        <p className="text-xs text-gray-400">{disclaimer}</p>
      )}

      {/* Restock orders */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-bold text-[#0F3D2E]">Restock Orders</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#0F3D2E] p-5 text-white">
            <div className="text-sm text-white/70">Ordered</div>
            <div className="text-3xl font-bold">{stats?.ordered ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-white p-5">
            <div className="text-sm text-gray-500">Received</div>
            <div className="text-3xl font-bold text-[#0F3D2E]">{stats?.received ?? 0}</div>
          </div>
        </div>

        {ordersError && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{ordersError}</span>
            <button
              onClick={loadOrders}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!ordersLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    No restock orders yet. Search above and place your first order.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}
                  </td>
                  <td className="px-4 py-3">{o.supplier}</td>
                  <td className="px-4 py-3">{o.product_name}</td>
                  <td className="px-4 py-3">{o.quantity}</td>
                  <td className="px-4 py-3">{money(o.total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        o.status === 'Received'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === 'Ordered' && (
                      <button
                        onClick={() => markReceived(o.id)}
                        className="rounded-lg bg-[#D9F26B] px-3 py-1 text-xs font-semibold text-[#0F3D2E] hover:bg-[#cfe85c]"
                      >
                        Mark received
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F3D2E]">Place restock order</h3>
              <button onClick={() => setSelected(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 text-sm text-gray-600">
              <div className="font-semibold">{selected.product_name}</div>
              <div>{selected.supplier}</div>
              <div>{money(selected.unit_price)} per unit</div>
            </div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Quantity</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mb-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9F26B]"
            />
            <div className="mb-4 text-sm">
              Total: <b>{money((Number(qty) || 0) * Number(selected.unit_price || 0))}</b>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                disabled={ordering}
                className="flex-1 rounded-xl bg-[#0F3D2E] py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {ordering ? 'Placing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}