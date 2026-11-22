import { useState, useEffect } from 'react';
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
import { Banknote, TrendingUp, Wallet, ShoppingBag } from 'lucide-react';
import { getSales } from '../lib/api';

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCKS = [
  { label: '12am-4am', from: 0, to: 3 },
  { label: '4am-8am', from: 4, to: 7 },
  { label: '8am-12pm', from: 8, to: 11 },
  { label: '12pm-4pm', from: 12, to: 15 },
  { label: '4pm-8pm', from: 16, to: 19 },
  { label: '8pm-12am', from: 20, to: 23 },
];

function Stat({ icon: Icon, label, value, sub, dark }) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm ${
        dark ? 'bg-sidebar text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            dark ? 'bg-lime text-sidebar' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Icon size={20} />
        </div>
        <div className={`text-sm ${dark ? 'text-white/70' : 'text-gray-500'}`}>{label}</div>
      </div>
      <div className="mt-4 break-words text-2xl font-bold tracking-tight xl:text-3xl">{value}</div>
      <div className={`mt-1 text-xs ${dark ? 'text-lime' : 'text-gray-400'}`}>{sub}</div>
    </div>
  );
}

// Turns [{day, hour, count}] into a grid[day][block] of order counts
function buildGrid(rows) {
  const grid = {};
  DAYS.forEach((d) => {
    grid[d] = BLOCKS.map(() => 0);
  });
  (rows ?? []).forEach((r) => {
    const day = DAYS.includes(r.day) ? r.day : null;
    const hour = Number(r.hour);
    const b = BLOCKS.findIndex((x) => hour >= x.from && hour <= x.to);
    if (day && b >= 0) grid[day][b] += Number(r.count) || 0;
  });
  return grid;
}

export default function Sales() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getSales());
    } catch (e) {
      setError(e.message || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  // Loads the page data once when it opens; load() sets loading/error state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const months = data?.revenueByMonth ?? [];
  const products = data?.topProducts ?? [];
  const grid = buildGrid(data?.ordersByTime);
  const maxCell = Math.max(1, ...DAYS.flatMap((d) => grid[d]));
  const maxMonth = Math.max(0, ...months.map((m) => Number(m.value) || 0));
  const maxProd = Math.max(1, ...products.map((p) => Number(p.revenue) || 0));
  const hasTimeData = (data?.ordersByTime ?? []).length > 0;

  // Busiest slot, for a plain-English takeaway
  let busiest = null;
  DAYS.forEach((d) =>
    grid[d].forEach((c, i) => {
      if (c > 0 && (!busiest || c > busiest.c)) busiest = { d, label: BLOCKS[i].label, c };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-sm text-gray-500">Revenue, profit and when your customers buy</p>
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
          icon={Banknote}
          label="Total Revenue"
          value={loading ? '…' : money(data?.totalRevenue)}
          sub="Completed and pending orders"
        />
        <Stat
          icon={TrendingUp}
          label="Total Profit"
          value={loading ? '…' : money(data?.totalProfit)}
          sub="Estimated at 30% margin"
        />
        <Stat
          icon={Wallet}
          label="Total Cost"
          value={loading ? '…' : money(data?.totalCost)}
          sub="Revenue minus profit"
        />
        <Stat
          icon={ShoppingBag}
          label="Average Order"
          value={loading ? '…' : money(data?.avgOrderValue)}
          sub="Per order"
        />
      </div>

      {/* Revenue by month */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 font-semibold text-gray-900">Revenue by month</div>
        {months.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
            {loading ? 'Loading…' : 'No sales data yet'}
          </div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {months.map((m, i) => (
                    <Cell
                      key={i}
                      fill={Number(m.value) === maxMonth ? '#D9F26B' : '#0F3D2E'}
                      stroke={Number(m.value) === maxMonth ? '#0F3D2E' : 'none'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Orders by time heatmap */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-3">
          <div className="mb-1 font-semibold text-gray-900">Orders by time</div>
          <p className="mb-4 text-xs text-gray-500">
            Darker squares mean more orders.
            {busiest &&
              ` Busiest time: ${busiest.d} ${busiest.label} (${busiest.c} orders).`}
          </p>

          {!hasTimeData ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">
              {loading ? 'Loading…' : 'No order times yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[460px]">
                <div
                  className="mb-1 grid gap-1"
                  style={{ gridTemplateColumns: '44px repeat(6, minmax(0, 1fr))' }}
                >
                  <div />
                  {BLOCKS.map((b) => (
                    <div key={b.label} className="text-center text-[10px] text-gray-500">
                      {b.label}
                    </div>
                  ))}
                </div>

                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="mb-1 grid gap-1"
                    style={{ gridTemplateColumns: '44px repeat(6, minmax(0, 1fr))' }}
                  >
                    <div className="flex items-center text-xs font-medium text-gray-600">{d}</div>
                    {grid[d].map((c, i) => {
                      const level = c / maxCell;
                      return (
                        <div
                          key={i}
                          title={`${d} ${BLOCKS[i].label}: ${c} orders`}
                          className="flex h-9 items-center justify-center rounded-md text-xs font-semibold"
                          style={{
                            backgroundColor:
                              c === 0 ? 'rgba(15,61,46,0.06)' : `rgba(15,61,46,${0.15 + 0.85 * level})`,
                            color: level > 0.45 ? '#ffffff' : '#0F3D2E',
                          }}
                        >
                          {c > 0 ? c : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-400">Times follow the server clock (UTC).</p>
        </div>

        {/* Top products */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 font-semibold text-gray-900">Top products by revenue</div>
          {products.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">
              {loading ? 'Loading…' : 'No products yet'}
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((p, i) => (
                <div key={p.name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-800">
                        {i + 1}. {p.name}
                      </div>
                      <div className="truncate text-xs text-gray-500">{p.category}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-gray-800">
                      {money(p.revenue)}
                    </div>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-sidebar"
                      style={{ width: `${(Number(p.revenue) / maxProd) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}