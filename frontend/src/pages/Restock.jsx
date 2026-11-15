import { useState, useEffect } from 'react';

const URGENCY_COLOR = {
  high: 'text-red-600 bg-red-100 border-red-200',
  medium: 'text-amber-600 bg-amber-100 border-amber-200',
  low: 'text-emerald-600 bg-emerald-100 border-emerald-200',
};
import { useLocation } from 'react-router-dom';
import { Search, Truck } from 'lucide-react';

const URGENCY_COLOR = {
  high: 'text-red-600 bg-red-100 border-red-200',
  medium: 'text-amber-600 bg-amber-100 border-amber-200',
  low: 'text-emerald-600 bg-emerald-100 border-emerald-200',
};
import {
  findSuppliers,
  placeRestockOrder,
  getRestockOrders,
  receiveRestock,
} from '../lib/api';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const URGENCY_COLOR = {
  high: 'text-red-600 bg-red-100 border-red-200',
  medium: 'text-amber-600 bg-amber-100 border-amber-200',
  low: 'text-emerald-600 bg-emerald-100 border-emerald-200',
};

export default function Restock() {
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [parsed, setParsed] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [orderQty, setOrderQty] = useState('1');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [restockOrders, setRestockOrders] = useState([]);
  const [restockStats, setRestockStats] = useState({ ordered: 0, received: 0 });
  const [restockLoading, setRestockLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const urlParams = new URLSearchParams(location.search);
  const initialQ = urlParams.get('q') || '';

  const handleSearch = async (e) => {
    // eslint-disable-next-line no-unused-expressions
    e && e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setOrderSuccess(null);
    try {
      const res = await findSuppliers(q);
      setParsed(res?.parsed ?? {});
      setResults(res?.results ?? []);
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
      setResults([]);
      setParsed(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRestockOrders = async () => {
    setRestockLoading(true);
    try {
      const res = await getRestockOrders();
      const rows = res?.data ?? [];
      setRestockOrders(rows);
      setRestockStats(res?.stats ?? { ordered: 0, received: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load restock orders');
    } finally {
      setRestockLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    if (initialQ && !query) {
      setQuery(initialQ);
      handleSearch();
    }
  }, [initialQ]);

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    loadRestockOrders();
  }, []);

  const urgencyColor = (u) => URGENCY_COLOR[u ?? 'low'] || URGENCY_COLOR.low;

  const openOrder = (result) => {
    setOrderResult(result);
    setOrderQty(String(parsed?.quantity ?? 1));
    setOrderSuccess(null);
    setOrderOpen(true);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    {/* Search form */}
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md shadow-2xl mb-8">
      <form onSubmit={handleSearch} className="space-y-3">
        <div>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D9F26B]/80 w-5 h-5" />
          <input
            type="text"
            placeholder="What do you need to restock? e.g. 200 amoxicillin urgently"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 pl-10 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D9F26B] focus:border-[#D9F26B] text-sm"
            required
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#D9F26B] text-[#0F3D2E] rounded-xl py-2 px-4 text-sm font-semibold hover:bg-[#cfe85c] transition"
          >
            Search
          </button>
        </div>
      </form>
    </div>}
    if (!orderResult) return;
    setOrderSubmitting(true);
    try {
      await placeRestockOrder({
        supplier_id: orderResult.supplier_id,
        product_name: orderResult.product_name,
        quantity: Number(orderQty) || 1,
      });
      setOrderSuccess(orderResult.product_name);
      setOrderOpen(false);
      await loadRestockOrders();
    } catch (err) {
      setError(err.message || 'Failed to place restock order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleReceive = async (id) => {
    try {
      await receiveRestock(id);
      setToast('Stock updated');
      setTimeout(() => setToast(null), 3000);
      await loadRestockOrders();
    } catch (err) {
      setError(err.message || 'Failed to mark received');
    }
  };

  const totalSpent = restockOrders.reduce((s, o) => s + Number(o.total || 0), 0);

  if (loading && !results.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Source Stock</h1>
        <p className="text-gray-500 text-sm">Tell Pill what you need and compare suppliers.</p>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-64 h-8 rounded bg-gray-200"></div>
            <div className="w-80 h-6 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Source Stock</h1>
          <p className="text-gray-500 text-sm">Tell Pill what you need and compare suppliers.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <span className="text-red-800 text-sm">{error}</span>
          <button
            type="button"
            onClick={() => { setError(null); }}
            className="px-3 py-1.5 rounded text-sm text-[#0F3D2E] underline hover:text-[#0F3D2E]/80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search */}
      <div className="rounded-2xl border border-gray-200 shadow-sm p-5">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="What do you need to restock? e.g. 200 amoxicillin urgently"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9F26B] focus:border-[#D9F26B]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full py-3 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2 animate-pulse">Searching</span>
            ) : (
              <>
                <Search size={18} /> Search
              </>
            )}
          </button>
        </form>
      </div>

      {/* AI understood chips */}
      {parsed && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Understood by AI
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${urgencyColor(
                parsed.urgency
              )}`}
            >
              {parsed.urgency}
            </span>
            <span className="px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-xs">
              {parsed.medicine || '—'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-xs">
              {parsed.quantity ? `${parsed.quantity} units` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length === 0 && !error && parsed && (
        <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
          <p className="text-gray-500 text-sm">No suppliers found for that medicine. Try another name.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {results.length} supplier{results.length === 1 ? '' : 's'} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r, i) => (
              <div
                key={r.supplier_id + '-' + r.product_name}
                className="rounded-2xl border border-gray-200 shadow-sm bg-white p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{r.supplier || 'Unknown supplier'}</h3>
                    {i === 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0F3D2E]/5 text-[#0F3D2E] text-[10px] font-semibold border border-[#0F3D2E]/20">
                        Best match
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">{r.address || '—'}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-[#0F3D2E]">📞</span> {r.phone || '—'}
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Unit price</span>
                    <span className="ml-auto text-gray-900 font-medium">${Number(r.unit_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Stock</span>
                    <span className="ml-auto text-gray-900 font-medium">{r.stock}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Delivers in</span>
                    <span className="ml-auto text-gray-900 font-medium">{r.delivery_hours ?? '—'}h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Distance</span>
                    <span className="ml-auto text-gray-900 font-medium">{r.distance_km ?? '—'} km away</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Est. total</span>
                    <span className="ml-auto text-gray-900 font-medium">${Number(r.est_total || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-medium ${
                      r.can_fulfil
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {r.can_fulfil ? 'Can fulfil' : 'Partial stock'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openOrder(r)}
                    className="flex-1 py-2 rounded-lg bg-[#0F3D2E] text-white text-xs font-semibold hover:bg-[#0F3D2E]/90 transition"
                  >
                    Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsed && results.length > 0 && parsed.disclaimer && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-[10px] text-gray-500 leading-relaxed">{parsed.disclaimer}</p>
        </div>
      )}

      {/* Restock Orders section */}
      <div className="rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Restock Orders</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <StatCard
            title="Ordered"
            value={restockStats?.ordered ?? 0}
            sublabel="Pending orders"
            Icon={Plus}
            variant="green"
          />
          <StatCard
            title="Received"
            value={restockStats?.received ?? 0}
            sublabel="Completed orders"
            Icon={CircleCheck}
          />
          <StatCard
            title="Total Spent"
            value={`$${totalSpent.toFixed(2)}`}
            sublabel="All restock orders"
            Icon={DollarIcon}
          />
        </div>

        {restockLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <div className="w-48 h-8 rounded bg-gray-200"></div>
              <div className="w-64 h-4 rounded bg-gray-200"></div>
            </div>
          </div>
        ) : restockOrders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm">No restock orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Supplier</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Product</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Quantity</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Total</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {restockOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {(o.created_at || '').slice(0, 10) || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{o.supplier || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{o.product_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{o.quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm font-medium">
                      ${Number(o.total || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={o.status || 'Ordered'} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {o.status === 'Ordered' ? (
                        <button
                          type="button"
                          onClick={() => handleReceive(o.id)}
                          className="text-xs text-[#0F3D2E] underline hover:text-[#0F3D2E]/80"
                        >
                          Mark received
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order modal */}
      <Modal open={orderOpen} onClose={() => setOrderOpen(false)} title="Place Restock Order">
        {orderResult && (
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Supplier</label>
              <p className="text-sm text-gray-900">{orderResult.supplier || '—'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Product</label>
              <p className="text-sm text-gray-900">{orderResult.product_name || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Quantity</label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Unit price</label>
                <p className="text-sm text-gray-900">${Number(orderResult.unit_price || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Total</label>
              <p className="text-sm font-bold text-[#0F3D2E]">
                ${(Number(orderQty || 0) * Number(orderResult.unit_price || 0)).toFixed(2)}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderOpen(false)}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={orderSubmitting}
                className="px-4 py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] font-semibold hover:bg-[#d4ec5f] transition disabled:opacity-60"
              >
                {orderSubmitting ? 'Ordering…' : 'Confirm'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {orderSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3 mb-4">
          <CircleCheck size={16} className="text-green-600" />
          <div>
            <p className="text-sm text-green-800 font-medium">Order placed</p>
            <p className="text-xs text-green-600">
              Restock order for “{orderSuccess}” has been created.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="rounded-lg bg-[#0F3D2E] text-white p-4 flex items-center gap-3 mb-4">
          <span className="text-sm">{toast}</span>
        </div>
      )}
    </div>
  );
}

function DollarIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="11" width="22" height="12" rx="2" ry="2" />
      <path d="M17 11V5a4 4 0 0 0-4-4H5" />
    </svg>
  );
}
