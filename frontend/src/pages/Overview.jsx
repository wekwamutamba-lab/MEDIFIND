import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ShoppingCart, Banknote, Users, AlertTriangle, Sparkles, Pill } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOverview, getInsights } from '../lib/api';

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const slug = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Medicine picture: looks for /medicines/<name>.png, falls back to a pill icon
function MedImg({ name, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-[#D9F26B]/40 text-[#0F3D2E] ${className}`}
      >
        <Pill size={22} />
      </div>
    );
  }
  return (
    <img
      src={`/medicines/${slug(name)}.png`}
      alt={name}
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}

function Stat({ icon: Icon, label, value, sub, dark }) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm ${
        dark ? 'bg-[#0F3D2E] text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            dark ? 'bg-[#D9F26B] text-[#0F3D2E]' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Icon size={20} />
        </div>
        <div className={`text-sm ${dark ? 'text-white/70' : 'text-gray-500'}`}>{label}</div>
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight">{value}</div>
      <div className={`mt-1 text-xs ${dark ? 'text-[#D9F26B]' : 'text-gray-400'}`}>{sub}</div>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [insights, setInsights] = useState(null);
  const [insLoading, setInsLoading] = useState(false);
  const [insError, setInsError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: d }) => {
      const u = d?.user;
      const n = u?.user_metadata?.full_name || (u?.email || '').split('@')[0] || '';
      setName(n);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getOverview());
    } catch (e) {
      setError(e.message || 'Failed to load the overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runInsights = async () => {
    setInsLoading(true);
    setInsError('');
    try {
      setInsights(await getInsights());
    } catch (e) {
      setInsError(e.message || 'Could not generate insights');
    } finally {
      setInsLoading(false);
    }
  };

  const sales = data?.salesByMonth ?? [];
  const top = data?.topMedicines ?? [];
  const latest = data?.latestOrders ?? [];
  const maxSale = Math.max(0, ...sales.map((s) => Number(s.value) || 0));
  const maxTop = Math.max(1, ...top.map((t) => Number(t.value) || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, <span className="font-semibold capitalize">{name || 'pharmacist'}</span>
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={load}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          dark
          icon={ShoppingCart}
          label="Total Orders"
          value={loading ? '…' : data?.totalOrders ?? 0}
          sub="All orders"
        />
        <Stat
          icon={Banknote}
          label="Total Revenue"
          value={loading ? '…' : money(data?.totalRevenue)}
          sub={`Profit ${money(data?.totalProfit)}`}
        />
        <Stat
          icon={Users}
          label="Total Customers"
          value={loading ? '…' : data?.totalCustomers ?? 0}
          sub="Registered"
        />
        <Stat
          dark
          icon={AlertTriangle}
          label="Low Stock"
          value={loading ? '…' : data?.lowStock ?? 0}
          sub="Low or out of stock"
        />
      </div>

      {/* Pill stock assistant */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F3D2E] text-[#D9F26B]">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Pill, your stock assistant</div>
              <div className="text-sm text-gray-500">
                AI reviews your stock and tells you what to restock.
              </div>
            </div>
          </div>
          <button
            onClick={runInsights}
            disabled={insLoading}
            className="rounded-xl bg-[#D9F26B] px-5 py-2.5 text-sm font-semibold text-[#0F3D2E] hover:bg-[#cfe85c] disabled:opacity-60"
          >
            {insLoading ? 'Thinking…' : 'Generate Insights'}
          </button>
        </div>

        {insError && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {insError}
          </div>
        )}

        {insights && (
          <div className="mt-5 space-y-4">
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">{insights.summary}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Restock suggestions
                </div>
                <div className="space-y-2">
                  {(insights.restock ?? []).map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">
                          {r.product}{' '}
                          <span className="font-normal text-gray-500">x {r.suggestedQty}</span>
                        </div>
                        <div className="truncate text-xs text-gray-500">{r.reason}</div>
                      </div>
                      <button
                        onClick={() =>
                          navigate(
                            `/restock?q=${encodeURIComponent(`${r.suggestedQty} ${r.product}`)}`
                          )
                        }
                        className="shrink-0 rounded-lg bg-[#0F3D2E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#145540]"
                      >
                        Find suppliers
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Expiring soon
                </div>
                <div className="space-y-2">
                  {(insights.expiring ?? []).map((x, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-sm"
                    >
                      <span className="font-semibold text-gray-900">{x.product}</span>
                      <span className="text-xs text-orange-600">{x.expiry_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-3">
          <div className="mb-4 font-semibold text-gray-900">Sales Analytics</div>
          {sales.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
              {loading ? 'Loading…' : 'No data yet'}
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {sales.map((s, i) => (
                      <Cell
                        key={i}
                        fill={Number(s.value) === maxSale ? '#D9F26B' : '#0F3D2E'}
                        stroke={Number(s.value) === maxSale ? '#0F3D2E' : 'none'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 font-semibold text-gray-900">Top Selling Medicine</div>
          {top.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
              {loading ? 'Loading…' : 'No data yet'}
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col items-center rounded-2xl bg-gray-50 py-5">
                <MedImg name={top[0].name} className="pill-sway h-24 w-24" />
                <div className="mt-3 text-base font-bold text-gray-900">{top[0].name}</div>
                <div className="text-xs text-gray-500">{top[0].value} units sold</div>
              </div>
              <div className="space-y-3">
                {top.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <MedImg name={t.name} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate font-medium text-gray-800">
                          {i + 1}. {t.name}
                        </span>
                        <span className="text-gray-500">{t.value}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-[#0F3D2E]"
                          style={{ width: `${(Number(t.value) / maxTop) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Latest orders */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 font-semibold text-gray-900">Latest Orders</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Medicine</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {latest.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    {loading ? 'Loading…' : 'No orders yet'}
                  </td>
                </tr>
              )}
              {latest.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-500">
                    #{String(o.id).slice(0, 8)}
                  </td>
                  <td className="py-3 pr-4">{o.customer_name}</td>
                  <td className="py-3 pr-4">{o.product_name}</td>
                  <td className="py-3 pr-4">{o.quantity}</td>
                  <td className="py-3 pr-4">{money(o.total)}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        o.order_status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : o.order_status === 'Cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {o.order_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}