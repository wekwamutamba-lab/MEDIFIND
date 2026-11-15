import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ShoppingCart, CreditCard, Users, AlertTriangle, RefreshCw, ChevronRight,
} from 'lucide-react';
import heroImg from '../assets/hero.png';
import { getOverview, getSales, getInsights } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [o, s] = await Promise.all([getOverview(), getSales()]);
        if (mounted) { setOverview(o); setSales(s); }
      } catch (err) { if (mounted) setError(err.message); }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const generateInsights = async () => {
    setInsightsLoading(true);
    setInsights(null);
    try { setInsights(await getInsights()); }
    catch (err) { setError(err.message || 'Failed to generate insights'); }
    finally { setInsightsLoading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, Demo Pharmacist</p>
        </div>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-64 h-8 rounded bg-gray-200"></div>
            <div className="w-48 h-6 rounded bg-gray-200"></div>
            <div className="w-40 h-6 rounded bg-gray-200"></div>
            <div className="w-56 h-6 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
        <span className="text-red-800 text-sm">Failed to load dashboard:</span>
        <span className="text-red-600 text-sm">{error}</span>
        <button
          type="button"
          onClick={() => { window.location.reload(); }}
          className="px-3 py-1.5 rounded text-sm text-[#0F3D2E] underline hover:text-[#0F3D2E]/80"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalOrders = overview?.totalOrders ?? 0;
  const totalRevenue = Number(overview?.totalRevenue || 0);
  const totalCustomers = overview?.totalCustomers ?? 0;
  const lowStock = overview?.lowStock ?? 0;
  const topMedicines = overview?.topMedicines ?? [];
  const recentOrders = overview?.latestOrders ?? [];

  const columns = [
    { key: 'id', label: 'Order ID', render: (row) => row.id || '—' },
    { key: 'customerName', label: 'Customer', render: (row) => row.customer_name || row.customerName || '—' },
    { key: 'medicine', label: 'Medicine', render: (row) => row.product_name || row.medicine || '—' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.order_status || row.status || 'Pending'} /> },
    { key: 'actions', label: 'Actions', render: (row) => (
      <button type="button" onClick={() => { setDetail(row); setDetailOpen(true); }} className="text-[#0F3D2E] hover:text-[#0F3D2E]/80 underline text-xs font-medium">View</button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome back, Demo Pharmacist</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <StatCard title="Total Orders" value={totalOrders} sublabel="All orders" Icon={ShoppingCart} variant="green" />
        <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} sublabel="This period" Icon={CreditCard} />
        <StatCard title="Total Customers" value={totalCustomers} sublabel="Registered" Icon={Users} />
        <StatCard title="Low Stock" value={lowStock} sublabel="Below minimum" Icon={AlertTriangle} variant={lowStock > 0 ? 'green' : 'default'} />
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden flex flex-col">
          <img src={heroImg} alt="Promo" className="w-full h-32 object-cover" />
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1">Stock Assistant</p>
              <p className="text-xs text-gray-500">Pill helps you manage stock.</p>
            </div>
            <button onClick={generateInsights} disabled={insightsLoading} className="mt-3 w-full py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] text-xs font-semibold hover:bg-[#d4ec5f] transition disabled:opacity-60">
              {insightsLoading ? 'Analyzing…' : 'Generate Insights'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Sales Analytics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(sales?.sales || []).map((m) => ({ month: m.month, sales: Number(m.value ?? m.total ?? 0) }))}>
                <CartesianGrid verticalDashArray="4" className="text-gray-200" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickFontSize={12} tickFill="#6b7280" />
                <YAxis tickLine={false} axisLine={false} tickFontSize={12} tickFill="#6b7280" />
                <Tooltip />
                <Bar dataKey="sales" fill="#0F3D2E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Selling Medicine</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMedicines.slice(0, 5)} layout="vertical">
                <YAxis dataKey="name" tickLine={false} axisLine={false} tickFontSize={12} tickFill="#6b7280" width={72} />
                <XAxis tickLine={false} axisLine={false} hide />
                <Tooltip />
                <Bar dataKey="value" fill="#0F3D2E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Latest Orders</h2>
          <Link to="/orders" className="text-xs text-[#0F3D2E] font-medium hover:underline flex items-center gap-1">View all <ChevronRight size={14} /></Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No recent orders.</p>
        ) : (
          <DataTable columns={columns} data={recentOrders} pageSize={5} />
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Pill — your stock assistant</h2>
        {insightsLoading && <div className="flex items-center justify-center py-6 text-gray-500 text-sm"><RefreshCw className="w-4 h-4 mr-2 animate-spin text-[#0F3D2E]" /> Analyzing stock and expiry data…</div>}
        {!insightsLoading && insights && (
          <div className="space-y-3">
            <div className="rounded-lg bg-[#0F3D2E]/80 border border-[#0F3D2E]/30 p-4 text-white">
              <p className="text-sm text-[#D9F26B]/90">{insights.summary || 'No insights available.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200"><p className="text-xs font-semibold text-gray-500 uppercase">Restock Needed</p></div>
                <div className="p-3">
                  {Array.isArray(insights.restock) && insights.restock.length === 0 ? <p className="text-xs text-gray-500">All stock levels are healthy.</p> : (
                    <ul className="space-y-2">
                      {(insights.restock || []).map((p, i) => {
                        const name = typeof p === 'string' ? p : p.product || p.name;
                        const suggestedQty = typeof p === 'string' ? '' : p.suggestedQty;
                        const stock = typeof p === 'string' ? '—' : p.stock;
                        const min = typeof p === 'string' ? '—' : p.minStock;
                        const searchQ = suggestedQty ? `${suggestedQty} ${name}` : name;
                        return (
                          <li key={i} className="text-xs flex justify-between items-center">
                            <span className="text-gray-700">{name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 font-medium">{stock} / {min}</span>
                              <Link
                                to={`/restock?q=${encodeURIComponent(searchQ)}`}
                                className="text-[10px] text-[#0F3D2E] underline hover:text-[#0F3D2E]/80 px-2 py-0.5 rounded border border-[#0F3D2E]/20"
                              >
                                Find suppliers
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200"><p className="text-xs font-semibold text-gray-500 uppercase">Expiring Soon</p></div>
                <div className="p-3">
                  {Array.isArray(insights.expiring) && insights.expiring.length === 0 ? <p className="text-xs text-gray-500">Nothing expiring soon.</p> : (
                    <ul className="space-y-2">
                      {(insights.expiring || []).map((p, i) => {
                        const name = typeof p === 'string' ? p : p.product;
                        const expiryDate = typeof p === 'string' ? '—' : p.expiry_date;
                        return (
                          <li key={i} className="text-xs flex justify-between"><span className="text-gray-700">{name}</span><span className="text-amber-600 font-medium">expires {expiryDate}</span></li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {!insights && !insightsLoading && <p className="text-sm text-gray-500 text-center py-8">Click "Generate Insights" to get restock and expiry recommendations from Pill.</p>}
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Order Details">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-gray-500">
              <p>Order ID</p><p className="font-semibold text-gray-900">{detail.id}</p>
              <p>Customer</p><p className="font-semibold text-gray-900">{detail.customer_name || detail.customerName}</p>
              <p>Medicine</p><p className="font-semibold text-gray-900">{detail.product_name || detail.medicine}</p>
              <p>Quantity</p><p className="font-semibold text-gray-900">{detail.quantity ?? 0}</p>
              <p>Total</p><p className="font-semibold text-gray-900">${Number(detail.total ?? 0).toFixed(2)}</p>
              <p>Status</p><StatusBadge status={detail.order_status || detail.status || 'Pending'} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
