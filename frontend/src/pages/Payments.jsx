import { useEffect, useState } from 'react';
import { getPayments } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchInput from '../components/SearchInput';

export default function Payments() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0, failed: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPayments({ search, page: 1, limit: 100 });
      const rows = res?.data ?? [];
      setData(rows);
      setStats(res?.stats ?? { completed: 0, pending: 0, failed: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load payments');
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search]);

  const columns = [
    { key: 'id', label: 'Payment ID', render: (row) => row.id || '—' },
    { key: 'orderId', label: 'Order ID', render: (row) => row.order_id || row.orderId || '—' },
    { key: 'customerName', label: 'Customer', render: (row) => row.customer_name || row.customerName || '—' },
    { key: 'amount', label: 'Amount', render: (row) => `$${Number(row.amount || 0).toFixed(2)}` },
    { key: 'method', label: 'Method', render: (row) => row.method || '—' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status || 'Pending'} /> },
    { key: 'date', label: 'Date', render: (row) => (row.payment_date || '').slice(0, 10) || '—' },
  ];

  const completed = data.filter((p) => p.status === 'Completed').length;
  const pending = data.filter((p) => p.status === 'Pending').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <div className="text-gray-500 text-sm">Loading payments…</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <div className="text-gray-500 text-sm">Track customer payments.</div>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <span className="text-red-800 text-sm">Error loading payments:</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <div className="text-gray-500 text-sm">Track customer payments.</div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">No payments found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="text-gray-500 text-sm">Track customer payments.</div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Payments" value={data.length} sublabel="All transactions" Icon={PayIcon} variant="green" />
        <StatCard title="Completed" value={stats?.completed ?? completed} sublabel="Completed" Icon={PaidIcon} variant="green" />
        <StatCard title="Pending" value={stats?.pending ?? pending} sublabel="Awaiting payment" Icon={PendingIcon} variant="green" />
        <StatCard title="Total Amount" value={`$${data.reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2)}`} sublabel="Collected" Icon={MoneyIcon} />
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Search payments</label>
        <SearchInput placeholder="Search by customer or order…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={data} pageSize={10} />
      </div>
    </div>
  );
}

function PayIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="11" width="22" height="12" rx="2" ry="2" />
      <path d="M17 11V5a4 4 0 0 0-4-4H5" />
    </svg>
  );
}
function PaidIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function PendingIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9z" />
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
