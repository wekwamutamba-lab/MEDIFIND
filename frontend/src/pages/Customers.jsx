import { useEffect, useState } from 'react';
import { getCustomers } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';

export default function Customers() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCustomers({ search, page: 1, limit: 100 });
      const rows = res?.data ?? [];
      setData(rows);
      setStats(res?.stats ?? { totalCustomers: 0 });
    } catch (err) { setError(err.message || 'Failed to load customers'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search]);

  const columns = [
    { key: 'name', label: 'Name', render: (row) => row.name || '—' },
    { key: 'email', label: 'Email', render: (row) => row.email || '—' },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
    { key: 'totalOrders', label: 'Orders', render: (row) => row.total_orders ?? 0 },
    { key: 'totalSpent', label: 'Spent', render: (row) => `$${Number(row.total_spent || 0).toFixed(2)}` },
    { key: 'lastOrder', label: 'Last Order', render: (row) => (row.last_order_date || row.lastOrder || '').slice(0, 10) || '—' },
  ];

  const totalSpent = data.reduce((s, c) => s + Number(c.total_spent || 0), 0);
  const totalOrders = data.reduce((s, c) => s + Number(c.total_orders || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <div className="text-gray-500 text-sm">Loading customers…</div>
        </div>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-48 h-8 rounded bg-gray-200"></div>
            <div className="w-64 h-4 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <div className="text-gray-500 text-sm">{stats?.totalCustomers ?? 0} customers on file</div>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <span className="text-red-800 text-sm">Error loading customers:</span>
          <span className="text-red-600 text-sm">{error}</span>
          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 rounded text-sm text-[#0F3D2E] underline hover:text-[#0F3D2E]/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <div className="text-gray-500 text-sm">{stats?.totalCustomers ?? 0} customers on file</div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">No customers found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="text-gray-500 text-sm">{stats?.totalCustomers ?? 0} customers on file</div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={data.length} sublabel="Registered profiles" Icon={UsersIcon} variant="green" />
        <StatCard title="Total Orders" value={totalOrders} sublabel="Placed by customers" Icon={OrderIcon} />
        <StatCard title="Total Spent" value={`$${totalSpent.toFixed(2)}`} sublabel="Customer spend" Icon={MoneyIcon} />
        <StatCard title="Avg per Customer" value={`$${(totalSpent / data.length || 0).toFixed(2)}`} sublabel="Average spend" Icon={AvgIcon} />
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Search customers</label>
        <SearchInput placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={data} pageSize={10} />
      </div>
    </div>
  );
}

function UsersIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function OrderIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l.4 2M7 13h10l4-8M5 17H9M7 13l.4 2M7 17l.4 2M3 17l.4 2M9 17l.4 2M13 17l.4 2M17 17l.4 2M21 13l-.4 2M13 13l-.4 2M9 13l-.4 2M5 13l-.4 2M3 13l-.4 2" />
    </svg>
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
function AvgIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
