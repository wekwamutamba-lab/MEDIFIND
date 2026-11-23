import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccess } from '../lib/access';
import { Search, Plus, Minus, Trash2, CheckCircle2, ShoppingCart, UserPlus } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const METHODS = ['Cash', 'EcoCash', 'Card', 'Bank Transfer'];

// The login token is attached automatically by the fetch wrapper in lib/supabase.js
async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) throw new Error(data?.error || `${method} ${path} failed (${res.status})`);
  return data;
}

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime';

const statusStyle = {
  'In Stock': 'bg-green-100 text-green-700',
  'Low Stock': 'bg-orange-100 text-orange-700',
  'Out of Stock': 'bg-red-100 text-red-700',
};

export default function Sell() {
  const navigate = useNavigate();
  const { isAdmin } = useAccess();

  const [pq, setPq] = useState('');
  const [products, setProducts] = useState([]);
  const [pLoading, setPLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [cart, setCart] = useState([]);

  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [picked, setPicked] = useState(false);
  const [matches, setMatches] = useState([]);
  const [method, setMethod] = useState('Cash');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  // Product search
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setPLoading(true);
      try {
        const res = await call('GET', `/products?search=${encodeURIComponent(pq)}&limit=12`);
        if (!cancelled) setProducts(res?.data ?? []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setPLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pq, refreshKey]);

  // Existing customer suggestions, only once at least 2 letters are typed
  const shownMatches = cName.trim().length >= 2 ? matches : [];
  useEffect(() => {
    if (picked) return undefined;
    const q = cName.trim();
    if (q.length < 2) return undefined; // nothing is shown under 2 letters (see shownMatches)
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await call('GET', `/customers?search=${encodeURIComponent(q)}&limit=5`);
        if (!cancelled) setMatches(res?.data ?? []);
      } catch {
        if (!cancelled) setMatches([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cName, picked]);

  const addToCart = (p) => {
    setError('');
    setCart((c) => {
      const found = c.find((x) => x.product_id === p.id);
      if (found) {
        return c.map((x) =>
          x.product_id === p.id ? { ...x, qty: Math.min(x.qty + 1, x.stock) } : x
        );
      }
      return [
        ...c,
        { product_id: p.id, name: p.name, price: Number(p.price) || 0, stock: p.quantity, qty: 1 },
      ];
    });
  };

  const setQty = (id, value) => {
    setCart((c) =>
      c.map((x) => {
        if (x.product_id !== id) return x;
        const n = Math.floor(Number(value)) || 1;
        return { ...x, qty: Math.max(1, Math.min(n, x.stock)) };
      })
    );
  };

  const removeItem = (id) => setCart((c) => c.filter((x) => x.product_id !== id));

  const total = cart.reduce((s, x) => s + x.price * x.qty, 0);

  const pickCustomer = (c) => {
    setCName(c.name || '');
    setCPhone(c.phone || '');
    setCEmail(String(c.email || '').endsWith('@walkin.medifind') ? '' : c.email || '');
    setPicked(true);
    setMatches([]);
  };

  const checkout = async () => {
    setError('');
    if (cart.length === 0) {
      setError('Add at least one medicine to the sale.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await call('POST', '/pos/checkout', {
        customer_name: cName,
        phone: cPhone,
        email: cEmail,
        payment_method: method,
        items: cart.map((x) => ({ product_id: x.product_id, quantity: x.qty })),
      });
      setReceipt(res);
      setCart([]);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message || 'Could not complete the sale');
    } finally {
      setSubmitting(false);
    }
  };

  const newSale = () => {
    setReceipt(null);
    setCName('');
    setCPhone('');
    setCEmail('');
    setPicked(false);
    setMethod('Cash');
    setError('');
  };

  // ---------- Receipt ----------
  if (receipt) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={32} className="text-green-600" />
            <div>
              <div className="text-lg font-bold text-gray-900">Sale completed</div>
              <div className="text-xs text-gray-500">
                Receipt #{receipt.receipt_no} · {new Date(receipt.date).toLocaleString()}
              </div>
            </div>
          </div>

          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              receipt.customer_created
                ? 'bg-lime/40 text-sidebar'
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            {receipt.customer_created
              ? `New customer added to your customer list: ${receipt.customer.name}`
              : `Sale added to the history of ${receipt.customer.name}`}
          </div>

          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Medicine</th>
                <th className="py-2">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((l) => (
                <tr key={l.product_id} className="border-t border-gray-100">
                  <td className="py-2 font-medium">{l.name}</td>
                  <td className="py-2">{l.quantity}</td>
                  <td className="py-2 text-right">{money(l.unit_price)}</td>
                  <td className="py-2 text-right">{money(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-sm text-gray-500">Paid by {receipt.payment_method}</span>
            <span className="text-xl font-bold text-sidebar">{money(receipt.total)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={newSale}
            className="rounded-xl bg-lime px-5 py-2.5 text-sm font-semibold text-sidebar hover:bg-[#cfe85c]"
          >
            New sale
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
          >
            {isAdmin ? 'View orders' : 'My sales'}
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
          >
            View customers
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate('/sales')}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
            >
              View sales
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------- Sale screen ----------
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
        <p className="text-sm text-gray-500">
          Sell medicine over the counter. The customer, order, payment and stock are all updated
          automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Medicines */}
        <div className="space-y-4 lg:col-span-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={pq}
              onChange={(e) => setPq(e.target.value)}
              placeholder="Search medicines…"
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime"
            />
          </div>

          {pLoading && <div className="text-sm text-gray-400">Loading…</div>}
          {!pLoading && products.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500">
              No medicines found.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => {
              const out = (p.quantity || 0) <= 0;
              return (
                <div key={p.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900">{p.name}</div>
                      <div className="truncate text-xs text-gray-500">{p.category}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        statusStyle[p.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="my-3 flex items-end justify-between">
                    <div className="text-lg font-bold text-sidebar">{money(p.price)}</div>
                    <div className="text-xs text-gray-500">{p.quantity} in stock</div>
                  </div>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className="mt-auto flex items-center justify-center gap-1 rounded-xl bg-sidebar py-2 text-sm font-semibold text-white hover:bg-[#145540] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={14} /> {out ? 'Out of stock' : 'Add to sale'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sale panel */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <ShoppingCart size={18} /> Current sale
            </div>

            {cart.length === 0 && (
              <div className="py-4 text-center text-sm text-gray-400">
                No medicines added yet.
              </div>
            )}

            <div className="space-y-3">
              {cart.map((x) => (
                <div key={x.product_id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{x.name}</div>
                      <div className="text-xs text-gray-500">{money(x.price)} each</div>
                    </div>
                    <button
                      onClick={() => removeItem(x.product_id)}
                      className="text-gray-400 hover:text-red-600"
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQty(x.product_id, x.qty - 1)}
                        className="rounded-lg border border-gray-300 p-1.5"
                        aria-label="Less"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={x.stock}
                        value={x.qty}
                        onChange={(e) => setQty(x.product_id, e.target.value)}
                        className="w-14 rounded-lg border border-gray-300 py-1 text-center text-sm"
                      />
                      <button
                        onClick={() => setQty(x.product_id, x.qty + 1)}
                        className="rounded-lg border border-gray-300 p-1.5"
                        aria-label="More"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-sm font-semibold">{money(x.price * x.qty)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-2xl font-bold text-sidebar">{money(total)}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <UserPlus size={18} /> Customer
            </div>

            <div className="relative">
              <input
                className={inputCls}
                placeholder="Customer name (leave empty for walk-in)"
                value={cName}
                onChange={(e) => {
                  setCName(e.target.value);
                  setPicked(false);
                }}
              />
              {shownMatches.length > 0 && !picked && (
                <div className="absolute left-0 right-0 z-10 mt-1 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase text-gray-400">
                    Existing customers
                  </div>
                  {shownMatches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickCustomer(c)}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.phone || c.email} · {c.total_orders} orders
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {picked ? (
              <div className="mt-2 text-xs font-medium text-green-700">
                Existing customer selected. This sale will be added to their history.
              </div>
            ) : (
              cName.trim().length >= 2 && (
                <div className="mt-2 text-xs text-gray-500">
                  Not in your list? A new customer will be created when you complete the sale.
                </div>
              )
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className={inputCls}
                placeholder="Phone (optional)"
                value={cPhone}
                onChange={(e) => setCPhone(e.target.value)}
              />
              <input
                className={inputCls}
                type="email"
                placeholder="Email (optional)"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
              />
            </div>

            <label className="mb-1 mt-4 block text-xs font-semibold text-gray-500">
              Payment method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-xl border py-2 text-sm font-medium ${
                    method === m
                      ? 'border-sidebar bg-sidebar text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              onClick={checkout}
              disabled={submitting || cart.length === 0}
              className="mt-5 w-full rounded-xl bg-lime py-3 text-sm font-bold text-sidebar hover:bg-[#cfe85c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Completing…' : `Complete sale · ${money(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
