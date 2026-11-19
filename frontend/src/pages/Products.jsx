import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';

export default function Products() {
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, low: 0, out: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [delId, setDelId] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', quantity: '', price: '', expiryDate: '', description: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts({ search, category, page: 1, limit: 100 });
      const rows = res?.data ?? [];
      setData(rows);
      setCategories(res?.categories ?? []);
      setStats(res?.stats ?? { total: 0, low: 0, out: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search, category]);

  const columns = [
    { key: 'sku', label: 'SKU', render: (row) => row.sku || row.id || '—' },
    { key: 'name', label: 'Medicine', render: (row) => row.name || '—' },
    { key: 'category', label: 'Category', render: (row) => row.category || '—' },
    { key: 'price', label: 'Price', render: (row) => `$${Number(row.price || 0).toFixed(2)}` },
    { key: 'stock', label: 'Stock', render: (row) => row.quantity ?? row.stock ?? 0 },
    { key: 'expiryDate', label: 'Expires', render: (row) => (row.expiry_date || row.expiryDate || '').slice(0, 10) || '—' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status || 'In Stock'} /> },
    { key: 'actions', label: 'Actions' },
  ];

  const handleAction = async (action, row) => {
    if (action === 'edit') {
      setEditProduct(row);
      setForm({
        name: row.name || '',
        category: row.category || '',
        quantity: String(row.quantity ?? row.stock ?? ''),
        price: String(row.price ?? ''),
        expiryDate: (row.expiry_date || row.expiryDate || '').slice(0, 10),
        description: row.description || '',
      });
      setEditOpen(true);
    } else if (action === 'delete') {
      setDelId(row.id);
      setDelOpen(true);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProduct(form);
      setAddOpen(false);
      setForm({ name: '', category: '', quantity: '', price: '', expiryDate: '', description: '' });
      await load();
    } catch (err) { setError(err.message || 'Failed to create product'); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    try {
      await updateProduct(editProduct.id, form);
      setEditOpen(false);
      await load();
    } catch (err) { setError(err.message || 'Failed to update product'); }
  };

  const handleDelete = async () => {
    if (!delId) return;
    try {
      await deleteProduct(delId);
      setDelOpen(false);
      setDelId(null);
      await load();
    } catch (err) { setError(err.message || 'Failed to delete product'); }
  };

  const lowStockCount = stats?.low ?? 0;
  const outStockCount = stats?.out ?? 0;

  const statCards = [
    { title: 'Total Products', value: stats?.total ?? data.length, sublabel: 'Active in catalog', Icon: BoxIcon, variant: 'green' },
    { title: 'Low Stock', value: lowStockCount, sublabel: 'Below minimum level', Icon: AlertIcon, variant: lowStockCount > 0 ? 'green' : 'default' },
    { title: 'Out of Stock', value: outStockCount, sublabel: 'No units left', Icon: OutIcon },
    { title: 'Categories', value: categories.length, sublabel: 'Product categories', Icon: CatIcon },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <button
            type="button"
            onClick={() => { setAddOpen(false); setAddOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
            disabled
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-48 h-8 rounded bg-gray-200"></div>
            <div className="w-64 h-4 rounded bg-gray-200"></div>
            <div className="w-32 h-4 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <button
            type="button"
            onClick={() => { setAddOpen(false); setAddOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <span className="text-red-800 text-sm">Error loading products:</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <button
            type="button"
            onClick={() => { setAddOpen(false); setAddOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">No products found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          type="button"
          onClick={() => { setAddOpen(false); setAddOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
        >
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1.5 rounded-full text-sm border text-gray-600 ${category ? 'border-gray-300 bg-white' : 'border-[#D9F26B] bg-[#D9F26B] text-[#0F3D2E] font-semibold'}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setCategory(cat.name)}
              className={`px-3 py-1.5 rounded-full text-sm border ${category === cat.name ? 'border-[#D9F26B] bg-[#D9F26B] text-[#0F3D2E] font-semibold' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-md">
          <SearchInput placeholder="Search medicine, SKU or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={data} pageSize={10} onAction={handleAction} />
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Product">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Medicine name</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Category</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select category</option>
                {categories.map((c) => <option key={catKey(c)} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Quantity</label>
              <input type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Price ($)</label>
              <input type="number" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Expiry date</label>
              <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] font-semibold">Save Product</button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen && !!editProduct} onClose={() => setEditOpen(false)} title="Edit Product">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Medicine name</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Category</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                {categories.map((c) => <option key={catKey(c)} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Quantity</label>
              <input type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Price ($)</label>
              <input type="number" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Expiry date</label>
              <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9F26B]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] font-semibold">Save Changes</button>
          </div>
        </form>
      </Modal>

      <Modal open={delOpen && !!delId} onClose={() => setDelOpen(false)} title="Delete Product">
        <p className="text-sm text-gray-700 mb-6">Are you sure you want to delete this product? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDelOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

function catKey(c) {
  return c.name;
}

function BoxIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18" />
      <path d="M9 21V3" />
    </svg>
  );
}
function AlertIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function OutIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function CatIcon({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18" />
      <path d="M9 21V3" />
    </svg>
  );
}
