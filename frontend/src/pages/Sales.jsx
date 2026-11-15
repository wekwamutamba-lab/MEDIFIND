import { useEffect, useState } from 'react';
import { getSales } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

import StatCard from '../components/StatCard';

export default function Sales() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getSales();
        if (mounted) setData(res);
      } catch (err) { if (mounted) setError(err.message); }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">Failed to load sales: {error}</div>;
  if (loading || !data) return <div className="flex items-center justify-center h-64 text-gray-500">Loading sales analytics…</div>;

  const {
    totalRevenue, totalProfit, totalCost, avgOrderValue,
    revenueByMonth, ordersByTime, topProducts,
  } = data;

  const monthly = (revenueByMonth || data.sales || []).map((m) => ({
    month: m.month,
    sales: Number(m.value ?? m.total ?? 0),
  }));
  const top = topProducts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <div className="text-gray-500 text-sm">Revenue, profit and order performance.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`$${Number(totalRevenue || 0).toFixed(2)}`} sublabel="All time" Icon={MoneyIcon} variant="green" />
        <StatCard title="Total Profit" value={`$${Number(totalProfit || 0).toFixed(2)}`} sublabel="After cost of goods" Icon={ProfitIcon} />
        <StatCard title="Total Cost" value={`$${Number(totalCost || 0).toFixed(2)}`} sublabel="Cost of goods sold" Icon={CostIcon} />
        <StatCard title="Avg Order Value" value={`$${Number(avgOrderValue || 0).toFixed(2)}`} sublabel="Per order" Icon={AvgIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Total Revenue</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid verticalDashArray="4" className="text-gray-200" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickFontSize={12} tickFill="#6b7280" />
                <YAxis tickLine={false} axisLine={false} tickFontSize={12} tickFill="#6b7280" />
                <Tooltip />
                <Bar dataKey="sales" fill="#0F3D2E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Orders By Time</h2>
          <HeatmapGrid data={ordersByTime || []} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Top Products</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Product</th>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Category</th>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {top.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No top products found.</td></tr>
              ) : (
                top.map((p) => (
                  <tr key={p.name} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-700">{p.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">$${Number(p.revenue || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MoneyIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="11" width="22" height="12" rx="2" ry="2" />
      <path d="M17 11V5a4 4 0 0 0-4-4H5" />
    </svg>
  );
}
function ProfitIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function CostIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
    </svg>
  );
}
function AvgIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function HeatmapGrid({ data }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
  const map = {};
  (data || []).forEach((d) => {
    map[`${d.day}|${d.hour}`] = Number(d.count ?? d.value ?? 0);
  });
  const vals = Object.values(map);
  const max = Math.max(1, ...vals);

  return (
    <div className="h-80 flex flex-col">
      <div className="flex items-end gap-1 mb-3 px-1">
        {hours.map((h) => (
          <div key={h} className="w-[34px] text-[10px] text-gray-400 text-center font-medium">{h}</div>
        ))}
      </div>
      <div className="flex items-center gap-1 px-1">
        <div className="w-[30px] text-[10px] text-gray-400 text-right font-medium mb-1">Day</div>
        <div className="flex flex-col items-center gap-1">
          {days.map((day) => (
            <div key={day} className="flex items-center gap-1">
              <div className="w-[30px] text-[10px] text-gray-400 text-right font-medium">{day}</div>
              <div className="flex gap-1">
                {hours.map((h) => {
                  const v = map[`${day}|${h}`] || 0;
                  const opacity = 0.15 + 0.85 * (v / max);
                  return (
                    <div
                      key={`${day}-${h}`}
                      className="w-[26px] h-[26px] rounded bg-[#0F3D2E] opacity-50"
                      style={{ opacity }}
                      title={`${day} ${h}: ${v} order${v === 1 ? '' : 's'}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
