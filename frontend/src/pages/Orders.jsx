import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getOrders, createOrder, updateOrder } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';

export default function Orders() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [form, setForm] = useState({ customerName: '', medicine: '', quantity: '1', total: '0', status: 'Pending', paymentStatus: 'Unpaid' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({ search, status, page: 1, limit: 100 });
      const rows = res?.data ?? [];
      setData(rows);
      setStats(res?.stats ?? { totalOrders: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search, status]);

  const pending = data.filter((o) => (o.order_status || o.status) === 'Pending').length;
  const revenue = data.reduce((s, o) => s + Number(o.total || 0), 0);

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
        paymentStatus: row.payment_status || row.paymentStatus || 'Unpaid',
      });
      setStatusOpen(true);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await createOrder(form);
      setAddOpen(false);
      setForm({ customerName: '', medicine: '', quantity: '1', total: '0', status: 'Pending', paymentStatus: 'Unpaid' });
      await load();
    } catch (err) { setError(err.message || 'Failed to create order'); }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!editOrder) return;
    try {
      await updateOrder(editOrder.id, form);
      setStatusOpen(false);
      await load();
    } catch (err) { setError(err.message || 'Failed to update order'); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <button
            type="button"
            onClick={() => { setAddOpen(false); setAddOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
            disabled
          >
            <Plus size={18} /> Add New Order
          </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <button
            type="button"
            onClick={() => { setAddOpen(false); setAddOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
          >
            <Plus size={18} /> Add New Order
          </button>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <span className="text-red-800 text-sm">Error loading orders:</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <button
            type="button"
            onClick={() => { setAddOpen(false); setAddOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
          >
            <Plus size={18} /> Add New Order
          </button>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">No orders found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button
          type="button"
          onClick={() => { setAddOpen(false); setAddOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
        >
          <Plus size={18} /> Add New Order
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={stats?.totalOrders ?? data.length} sublabel="All orders" Icon={OrderIcon} variant="green" />
        <StatCard title="Pending" value={pending} sublabel="Awaiting fulfillment" Icon={PendingIcon} />
        <StatCard title="Total Revenue" value={`$${revenue.toFixed(2)}`} sublabel="This period" Icon={MoneyIcon} />
        <StatCard title="Average Order" value={`$${(revenue / data.length || 0).toFixed(2)}`} sublabel="Per order" Icon={AvgIcon} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatus('')}
            className={`px-3 py-1.5 rounded-full text-sm border ${status ? 'border-gray-300 bg-white text-gray-600' : 'border-[#D9F26B] bg-[#D9F26B] text-[#0F3D2E] font-semibold'}`}
          >
            All Status
          </button>
          {['Pending', 'Processing', 'Delivered', 'Cancelled'].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-sm border ${status === s ? 'border-[#D9F26B] bg-[#D9F26B] text-[#0F3D2E] font-semibold' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-md">
          <SearchInput placeholder="Search order, customer or medicine…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={data} pageSize={10} onAction={handleAction} />
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Order">
        <form onSubmit={handleAddSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Quantity</label>
              <input type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Total ($)</label>
              <input type="number" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Status</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Payment status</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] font-semibold">Create Order</button>
          </div>
        </form>
      </Modal>

      <Modal open={statusOpen && !!editOrder} onClose={() => setStatusOpen(false)} title="Update Order">
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Order</label>
            <p className="text-sm text-gray-900 font-medium">{editOrder?.id ?? '—'}</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Customer</label>
            <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Medicine</label>
            <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.medicine} onChange={(e) => setForm({ ...form, medicine: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Quantity</label>
              <input type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Total ($)</label>
              <input type="number" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Status</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Payment status</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
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
