import { useEffect, useState } from 'react';
import { getPayments } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchInput from '../components/SearchInput';
import ListBody from '../components/ListBody';
import useDebounced from '../lib/useDebounced';

export default function Payments() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0, failed: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const query = useDebounced(search);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPayments({ search: query, page: 1, limit: 100 });
      const rows = res?.data ?? [];
      setData(rows);
      setStats(res?.stats ?? { completed: 0, pending: 0, failed: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load payments');
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [query]);

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
  const totalPayments = (stats?.completed ?? 0) + (stats?.pending ?? 0) + (stats?.failed ?? 0);
  // Only completed payments count as money collected
  const collected = data
    .filter((p) => p.status === 'Completed')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="text-gray-500 text-sm">Track customer payments.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Payments" value={totalPayments || data.length} sublabel="All transactions" Icon={PayIcon} variant="green" />
        <StatCard title="Completed" value={stats?.completed ?? completed} sublabel="Completed" Icon={PaidIcon} variant="green" />
        <StatCard title="Pending" value={stats?.pending ?? pending} sublabel="Awaiting payment" Icon={PendingIcon} variant="green" />
        <StatCard title="Total Amount" value={`$${collected.toFixed(2)}`} sublabel="Collected" Icon={MoneyIcon} />
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Search payments</label>
        <SearchInput placeholder="Search by customer or order…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <ListBody
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={data.length === 0}
        emptyText={search ? 'No payments match your search.' : 'No payments yet.'}
      >
        <DataTable columns={columns} data={data} pageSize={10} />
      </ListBody>
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
