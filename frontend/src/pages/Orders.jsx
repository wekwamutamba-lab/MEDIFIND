import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getOrders, createOrder, updateOrder } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';
import ListBody from '../components/ListBody';
import useDebounced from '../lib/useDebounced';

const EMPTY_FORM = { customerName: '', medicine: '', quantity: '1', total: '0', status: 'Pending', paymentStatus: 'Pending' };
const STATUSES = ['Pending', 'Completed', 'Cancelled'];
const EMPTY_STATS = { total: 0, pending: 0, cancelled: 0, revenue: 0 };

export default function Orders() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const query = useDebounced(search);
  const [status, setStatus] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({ search: query, status, page: 1, limit: 100 });
      const rows = res?.data ?? [];
      setData(rows);
      setStats(res?.stats ?? EMPTY_STATS);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [query, status]);

  // Card figures cover all orders (from the server), not just the rows on screen.
  // Revenue leaves out cancelled orders.
  const revenue = Number(stats?.revenue ?? 0);
  const activeOrders = (stats?.total ?? 0) - (stats?.cancelled ?? 0);

  const columns = [
    { key: 'id', label: 'Order ID', render: (row) => row.id || '—' },
    { key: 'customerName', label: 'Customer', render: (row) => row.customer_name || row.customerName || '—' },
    { key: 'medicine', label: 'Medicine', render: (row) => row.product_name || row.medicine || '—' },
    { key: 'quantity', label: 'Qty', render: (row) => row.quantity ?? 0 },
    { key: 'total', label: 'Total', render: (row) => `$${Number(oTotal(row)).toFixed(2)}` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.order_status || row.status || 'Pending'} /> },
    { key: 'paymentStatus', label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || row.paymentStatus || 'Unpaid'} /> },
    { key: 'date', label: 'Date', render: (row) => (row.order_date || row.date || '').slice(0, 10) || '—' },
    { key: 'actions', label: 'Actions' },
  ];

  function oTotal(row) {
    return row.total ?? 0;
  }

  const handleAction = (action, row) => {
    if (action === 'edit') {
      setEditOrder(row);
      setForm({
        customerName: row.customer_name || row.customerName || '',
        medicine: row.product_name || row.medicine || '',
        quantity: String(row.quantity ?? 1),
        total: String(oTotal(row)),
        status: row.order_status || row.status || 'Pending',
        paymentStatus: row.payment_status || row.paymentStatus || 'Pending',
      });
      setSaveError('');
      setStatusOpen(true);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSaveError('');
    setAddOpen(true);
  };

  // Save errors are shown inside the open form, so the form and what was typed stay put
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      await createOrder(form);
      setAddOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) { setSaveError(err.message || 'Failed to create order'); }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!editOrder) return;
    setSaveError('');
    try {
      await updateOrder(editOrder.id, form);
      setStatusOpen(false);
      await load();
    } catch (err) { setSaveError(err.message || 'Failed to update order'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
        >
          <Plus size={18} /> Add New Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={stats?.total ?? 0} sublabel="All orders" Icon={OrderIcon} variant="green" />
        <StatCard title="Pending" value={stats?.pending ?? 0} sublabel="Awaiting fulfillment" Icon={PendingIcon} />
        <StatCard title="Total Revenue" value={`$${revenue.toFixed(2)}`} sublabel="Excluding cancelled" Icon={MoneyIcon} />
        <StatCard title="Average Order" value={`$${(activeOrders > 0 ? revenue / activeOrders : 0).toFixed(2)}`} sublabel="Per order, excluding cancelled" Icon={AvgIcon} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatus('')}
            className={`px-3 py-1.5 rounded-full text-sm border ${status ? 'border-gray-300 bg-white text-gray-600' : 'border-[#D9F26B] bg-[#D9F26B] text-[#0F3D2E] font-semibold'}`}
          >
            All Status
          </button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-sm border ${status === s ? 'border-[#D9F26B] bg-[#D9F26B] text-[#0F3D2E] font-semibold' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-md">
          <SearchInput placeholder="Search order, customer or medicine…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <ListBody
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={data.length === 0}
        emptyText={search || status ? 'No orders match your search.' : 'No orders yet.'}
      >
        <DataTable columns={columns} data={data} pageSize={10} onAction={handleAction} />
      </ListBody>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Order">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {saveError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{saveError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Customer name</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Medicine</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.medicine} onChange={(e) => setForm({ ...form, medicine: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Quantity</label>
            <input type="number" min="1" step="1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </div>
          <p className="text-xs text-gray-500">
            The total is worked out from the medicine&apos;s price. New orders start as Pending; change the status from the order list.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] font-semibold">Create Order</button>
          </div>
        </form>
      </Modal>

      <Modal open={statusOpen && !!editOrder} onClose={() => setStatusOpen(false)} title="Update Order">
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          {saveError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{saveError}</div>}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Order</label>
            <p className="text-sm text-gray-900 font-medium">{editOrder?.id ?? '—'}</p>
          </div>
          {/* Only the order status can be changed here; the other details are shown for reference */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Customer</label>
              <p className="text-sm text-gray-900">{form.customerName || '—'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Medicine</label>
              <p className="text-sm text-gray-900">{form.medicine || '—'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Quantity</label>
              <p className="text-sm text-gray-900">{form.quantity}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Total</label>
              <p className="text-sm text-gray-900">${Number(form.total || 0).toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Payment</label>
              <p className="text-sm text-gray-900">{form.paymentStatus}</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Status</label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <p className="text-xs text-gray-500">Marking an order Completed also marks it as paid.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setStatusOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] font-semibold">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function OrderIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l.4 2M7 13h10l4-8M5 17H9M7 13l.4 2M7 17l.4 2M3 17l.4 2M9 17l.4 2M13 17l.4 2M17 17l.4 2M21 13l-.4 2M13 13l-.4 2M9 13l-.4 2M5 13l-.4 2M3 13l-.4 2" />
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
function AvgIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
