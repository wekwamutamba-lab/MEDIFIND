import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, Trash2, Pencil, Package, Phone, MapPin, Clock } from 'lucide-react';
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listSupplierProducts,
  addSupplierProduct,
  deleteSupplierProduct,
} from '../lib/extra';

const EMPTY = {
  name: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  delivery_hours: 24,
  notes: '',
};

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime';

export default function Suppliers() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [openId, setOpenId] = useState(null); // supplier whose products are shown
  const [products, setProducts] = useState([]);
  const [pForm, setPForm] = useState({ product_name: '', category: '', unit_price: '', stock: '' });

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await listSuppliers(q);
      setRows(res?.data ?? []);
    } catch (e) {
      setError(e.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
  };
  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name || '',
      address: s.address || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      delivery_hours: s.delivery_hours ?? 24,
      notes: s.notes || '',
    });
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Supplier name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) await updateSupplier(editingId, form);
      else await createSupplier(form);
      setMessage(editingId ? 'Supplier updated.' : 'Supplier added.');
      setForm(null);
      await load(search);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.name} and its product list?`)) return;
    try {
      await deleteSupplier(s.id);
      setMessage('Supplier deleted.');
      if (openId === s.id) setOpenId(null);
      await load(search);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleProducts = async (s) => {
    if (openId === s.id) {
      setOpenId(null);
      return;
    }
    setOpenId(s.id);
    setProducts([]);
    try {
      const res = await listSupplierProducts(s.id);
      setProducts(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    }
  };

  const addProduct = async () => {
    if (!pForm.product_name.trim()) return;
    try {
      await addSupplierProduct(openId, pForm);
      setPForm({ product_name: '', category: '', unit_price: '', stock: '' });
      const res = await listSupplierProducts(openId);
      setProducts(res?.data ?? []);
      await load(search);
    } catch (e) {
      setError(e.message);
    }
  };

  const removeProduct = async (pid) => {
    try {
      await deleteSupplierProduct(openId, pid);
      setProducts((p) => p.filter((x) => x.id !== pid));
      await load(search);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500">
            Your own suppliers, plus the shared MediFind supplier directory every pharmacy can search
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-sidebar hover:bg-[#cfe85c]"
        >
          <Plus size={16} /> Add supplier
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers…"
          className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime"
        />
      </div>

      {loading && <div className="text-sm text-gray-400">Loading…</div>}
      {!loading && rows.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
          No suppliers yet. Click "Add supplier" to add your first one.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((s) => (
          <div key={s.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-sidebar">{s.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.shared ? 'bg-gray-100 text-gray-600' : 'bg-lime/40 text-sidebar'}`}>
                    {s.shared ? 'Shared directory' : 'Your supplier'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {s.address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {s.address}
                    </span>
                  )}
                  {s.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {s.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Delivers in {s.delivery_hours ?? 24}h
                  </span>
                </div>
                {(s.email || s.whatsapp) && (
                  <div className="mt-1 text-xs text-gray-500">
                    {s.email && <span>{s.email}</span>}
                    {s.email && s.whatsapp && <span> · </span>}
                    {s.whatsapp && <span>WhatsApp {s.whatsapp}</span>}
                  </div>
                )}
                {s.notes && <div className="mt-2 text-xs text-gray-400">{s.notes}</div>}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleProducts(s)}
                  className="flex items-center gap-1 rounded-lg bg-sidebar px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#145540]"
                >
                  <Package size={14} /> {s.product_count} products
                </button>
                {/* shared suppliers can be searched and ordered from, but not changed */}
                {!s.shared && (
                  <>
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(s)}
                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {openId === s.id && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                {s.shared && (
                  <p className="mb-3 text-xs text-gray-500">This supplier is in the shared directory, so its list cannot be changed here.</p>
                )}
                {!s.shared && (
                <div className="mb-3 grid gap-2 sm:grid-cols-5">
                  <input
                    className={`${inputCls} sm:col-span-2`}
                    placeholder="Medicine name"
                    value={pForm.product_name}
                    onChange={(e) => setPForm({ ...pForm, product_name: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    placeholder="Category"
                    value={pForm.category}
                    onChange={(e) => setPForm({ ...pForm, category: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={pForm.unit_price}
                    onChange={(e) => setPForm({ ...pForm, unit_price: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={pForm.stock}
                      onChange={(e) => setPForm({ ...pForm, stock: e.target.value })}
                    />
                    <button
                      onClick={addProduct}
                      className="shrink-0 rounded-xl bg-lime px-3 text-sm font-semibold text-sidebar"
                    >
                      Add
                    </button>
                  </div>
                </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-2 pr-4">Medicine</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4">Price</th>
                        <th className="py-2 pr-4">Stock</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-gray-400">
                            No products listed for this supplier yet.
                          </td>
                        </tr>
                      )}
                      {products.map((p) => (
                        <tr key={p.id} className="border-t border-gray-100">
                          <td className="py-2 pr-4 font-medium">{p.product_name}</td>
                          <td className="py-2 pr-4 text-gray-500">{p.category}</td>
                          <td className="py-2 pr-4">${Number(p.unit_price || 0).toFixed(2)}</td>
                          <td className="py-2 pr-4">{p.stock}</td>
                          <td className="py-2 text-right">
                            {!s.shared && (
                              <button
                                onClick={() => removeProduct(p.id)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-sidebar">
                {editingId ? 'Edit supplier' : 'Add supplier'}
              </h3>
              <button onClick={() => setForm(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                className={inputCls}
                placeholder="Supplier name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="WhatsApp (e.g. 263771234567)"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
              <input
                className={inputCls}
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">
                  Delivery time (hours)
                </label>
                <input
                  className={inputCls}
                  type="number"
                  min="1"
                  value={form.delivery_hours}
                  onChange={(e) => setForm({ ...form, delivery_hours: e.target.value })}
                />
              </div>
              <textarea
                className={inputCls}
                rows={3}
                placeholder="Notes (payment terms, contact person…)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setForm(null)}
                className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-sidebar py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}