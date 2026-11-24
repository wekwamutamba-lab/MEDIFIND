import { useEffect, useState } from 'react';
import { getPayments } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchInput from '../components/SearchInput';
import ListBody from '../components/ListBody';
import useDebounced from '../lib/useDebounced';
import ExportMenu from '../components/ExportMenu';
import { fetchAllPages } from '../lib/exportFile';

const PAGE_SIZE = 10;
const EMPTY_STATS = { completed: 0, pending: 0, failed: 0, collected: 0 };

export default function Payments() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const query = useDebounced(search);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPayments({ search: query, page: p, limit: PAGE_SIZE });
      setData(res?.data ?? []);
      setTotal(res?.total ?? 0);
      setStats(res?.stats ?? EMPTY_STATS);
    } catch (err) {
      setError(err.message || 'Failed to load payments');
    } finally { setLoading(false); }
  };

  // A new search starts again from page 1
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); load(1); }, [query]);

  const goToPage = (p) => { setPage(p); load(p); };

  const columns = [
    { key: 'id', label: 'Payment ID', render: (row) => row.id || '—' },
    { key: 'orderId', label: 'Order ID', render: (row) => row.order_id || row.orderId || '—' },
    { key: 'customerName', label: 'Customer', render: (row) => row.customer_name || row.customerName || '—' },
    { key: 'amount', label: 'Amount', render: (row) => `$${Number(row.amount || 0).toFixed(2)}` },
    { key: 'method', label: 'Method', render: (row) => row.method || '—' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status || 'Pending'} /> },
    { key: 'date', label: 'Date', render: (row) => (row.payment_date || '').slice(0, 10) || '—' },
  ];

  // Export: every payment matching the search, not just this page
  const buildReport = async () => {
    const rows = await fetchAllPages(getPayments, { search: query });
    return {
      title: 'Payments',
      subtitle: `${rows.length} payments${query ? ` (Search: "${query}")` : ''}`,
      fileBase: 'medifind-payments',
      sections: [{
        columns: [
          { label: 'Payment ID', value: (r) => r.id ?? '', width: 12 },
          { label: 'Order ID', value: (r) => r.order_id ?? '', width: 10 },
          { label: 'Customer', value: (r) => r.customer_name || '', width: 24 },
          { label: 'Amount ($)', value: (r) => Number(r.amount || 0), money: true },
          { label: 'Method', value: (r) => r.method || '' },
          { label: 'Status', value: (r) => r.status || 'Pending' },
          { label: 'Date', value: (r) => (r.payment_date || '').slice(0, 10) },
        ],
        rows,
      }],
    };
  };

  // Card figures cover every payment (from the server), not only this page.
  // Only completed payments count as money collected.
  const totalPayments = (stats?.completed ?? 0) + (stats?.pending ?? 0) + (stats?.failed ?? 0);
  const collected = Number(stats?.collected ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <div className="text-gray-500 text-sm">Track customer payments.</div>
        </div>
        <ExportMenu buildReport={buildReport} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Payments" value={totalPayments} sublabel="All transactions" Icon={PayIcon} variant="green" />
        <StatCard title="Completed" value={stats?.completed ?? 0} sublabel="Completed" Icon={PaidIcon} variant="green" />
        <StatCard title="Pending" value={stats?.pending ?? 0} sublabel="Awaiting payment" Icon={PendingIcon} variant="green" />
        <StatCard title="Total Amount" value={`$${collected.toFixed(2)}`} sublabel="Collected" Icon={MoneyIcon} />
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Search payments</label>
        <SearchInput placeholder="Search by customer or order…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <ListBody
        loading={loading}
        error={error}
        onRetry={() => load()}
        isEmpty={data.length === 0}
        emptyText={search ? 'No payments match your search.' : 'No payments yet.'}
      >
        <DataTable columns={columns} data={data} pageSize={PAGE_SIZE} total={total} page={page} onPageChange={goToPage} />
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
