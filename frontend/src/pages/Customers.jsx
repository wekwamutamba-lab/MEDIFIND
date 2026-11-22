import { useEffect, useState } from 'react';
import { getCustomers } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';
import ListBody from '../components/ListBody';
import useDebounced from '../lib/useDebounced';

const PAGE_SIZE = 10;
const EMPTY_STATS = { total: 0, totalOrders: 0, totalSpent: 0 };

export default function Customers() {
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
      const res = await getCustomers({ search: query, page: p, limit: PAGE_SIZE });
      setData(res?.data ?? []);
      setTotal(res?.total ?? 0);
      setStats(res?.stats ?? EMPTY_STATS);
    } catch (err) { setError(err.message || 'Failed to load customers'); }
    finally { setLoading(false); }
  };

  // A new search starts again from page 1
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); load(1); }, [query]);

  const goToPage = (p) => { setPage(p); load(p); };

  const columns = [
    { key: 'name', label: 'Name', render: (row) => row.name || '—' },
    { key: 'email', label: 'Email', render: (row) => row.email || '—' },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
    { key: 'totalOrders', label: 'Orders', render: (row) => row.total_orders ?? 0 },
    { key: 'totalSpent', label: 'Spent', render: (row) => `$${Number(row.total_spent || 0).toFixed(2)}` },
    { key: 'lastOrder', label: 'Last Order', render: (row) => (row.last_order_date || row.lastOrder || '').slice(0, 10) || '—' },
  ];

  // Card figures cover every customer (from the server), not only this page
  const totalSpent = Number(stats?.totalSpent ?? 0);
  const totalOrders = Number(stats?.totalOrders ?? 0);
  const customerCount = Number(stats?.total ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="text-gray-500 text-sm">{stats?.total ?? 0} customers on file</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={customerCount} sublabel="Registered profiles" Icon={UsersIcon} variant="green" />
        <StatCard title="Total Orders" value={totalOrders} sublabel="Placed by customers" Icon={OrderIcon} />
        <StatCard title="Total Spent" value={`$${totalSpent.toFixed(2)}`} sublabel="Customer spend" Icon={MoneyIcon} />
        <StatCard title="Avg per Customer" value={`$${(customerCount ? totalSpent / customerCount : 0).toFixed(2)}`} sublabel="Average spend" Icon={AvgIcon} />
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Search customers</label>
        <SearchInput placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <ListBody
        loading={loading}
        error={error}
        onRetry={() => load()}
        isEmpty={data.length === 0}
        emptyText={search ? 'No customers match your search.' : 'No customers yet.'}
      >
        <DataTable columns={columns} data={data} pageSize={PAGE_SIZE} total={total} page={page} onPageChange={goToPage} />
      </ListBody>
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
