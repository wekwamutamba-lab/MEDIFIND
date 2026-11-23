import { useState, useEffect, Suspense } from 'react';
import { NavLink, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import { supabase } from '../lib/supabase';
import { getOverview, getMe, getStaff } from '../lib/api';
import { AccessContext, tillMayOpen } from '../lib/access';
import AccessGate from './AccessGate';
import { globalSearch } from '../lib/extra';
import {
  Menu,
  X,
  Bell,
  LogOut,
  Home,
  ShoppingCart,
  Banknote,
  Users,
  CreditCard,
  HelpCircle,
  Sliders,
  Search,
  Package,
  Truck,
  Building2,
  Sun,
  Moon,
  Receipt,
  UserCog,
} from 'lucide-react';

const MAIN_LINKS = [
  { name: 'Overview', path: '/overview', icon: Home },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'New Sale', path: '/sell', icon: Receipt },
  { name: 'Orders', tillName: 'My Sales', path: '/orders', icon: ShoppingCart },
  { name: 'Sales', path: '/sales', icon: Banknote },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Payments', path: '/payments', icon: CreditCard },
  { name: 'Restock', path: '/restock', icon: Truck },
  { name: 'Suppliers', path: '/suppliers', icon: Building2 },
  { name: 'Staff', path: '/staff', icon: UserCog },
];

// Till operators see New Sale first
const TILL_ORDER = ['/sell', '/products', '/customers', '/orders'];

const linkClass = (active) =>
  `w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition ${
    active
      ? 'bg-lime text-sidebar font-semibold'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`;

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState(null); // GET /api/me: { user, staff }
  const [meError, setMeError] = useState('');
  const [pendingStaff, setPendingStaff] = useState(0);
  const [dark, setDark] = useState(() => localStorage.getItem('mf_theme') === 'dark');
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  const [query, setQuery] = useState('');
  const [fetched, setFetched] = useState(null); // { q, data } from the last search
  const [searchOpen, setSearchOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const active = me?.staff?.status === 'active';
  const isAdmin = active && me.staff.role === 'admin';

  // Login check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login', { replace: true });
      } else {
        setReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login', { replace: true });
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Light / dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('mf_theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Who am I: role and approval status
  const fetchMe = () =>
    getMe()
      .then((res) => {
        setMe(res);
        setMeError('');
      })
      .catch((err) => setMeError(err.message || 'Could not load your account'));
  const loadMe = () => {
    setMeError('');
    fetchMe();
  };
  useEffect(() => {
    if (ready) fetchMe();
  }, [ready]);

  // Admins: number of people waiting for approval, shown next to Staff
  useEffect(() => {
    if (!isAdmin) return;
    getStaff()
      .then((res) => setPendingStaff((res?.staff ?? []).filter((x) => x.status === 'pending').length))
      .catch(() => {});
  }, [isAdmin, location.pathname]);

  // Notifications (admins only: they come from the overview figures)
  useEffect(() => {
    if (!isAdmin) return;
    getOverview()
      .then((res) => {
        const list = [];
        if ((res?.lowStock ?? 0) > 0) {
          list.push({
            id: 'low',
            title: `${res.lowStock} products are low or out of stock`,
            text: 'Open Restock to find suppliers',
            to: '/restock',
          });
        }
        const pending = (res?.latestOrders ?? []).filter(
          (o) => o.order_status === 'Pending'
        ).length;
        if (pending > 0) {
          list.push({
            id: 'pending',
            title: `${pending} recent orders are pending`,
            text: 'Review them on the Orders page',
            to: '/orders',
          });
        }
        setNotifs(list);
      })
      .catch(() => {});
  }, [isAdmin]);

  // Live search (waits 300ms after you stop typing). The answer is kept with the
  // text it was for, so results and "Searching…" are worked out from that and
  // results for old text never show.
  const liveQuery = query.trim();
  const results = liveQuery.length >= 2 && fetched?.q === liveQuery ? fetched.data : null;
  const searching = liveQuery.length >= 2 && fetched?.q !== liveQuery;
  useEffect(() => {
    if (liveQuery.length < 2) return undefined;
    const t = setTimeout(async () => {
      let data;
      try {
        data = await globalSearch(liveQuery);
      } catch {
        data = { products: [], customers: [], orders: [] };
      }
      setFetched({ q: liveQuery, data });
    }, 300);
    return () => clearTimeout(t);
  }, [liveQuery]);

  const go = (path) => {
    setSearchOpen(false);
    setQuery('');
    navigate(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setSidebarOpen(false);

  if (!ready || (!me && !meError)) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }

  if (meError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-lg font-bold text-sidebar">Could not load your account</h1>
          <p className="mt-2 text-sm text-gray-500">{meError}</p>
          <div className="mt-6 flex gap-2">
            <button onClick={loadMe} className="flex-1 rounded-xl bg-lime py-2.5 text-sm font-semibold text-sidebar hover:bg-[#cfe85c]">
              Try again
            </button>
            <button onClick={handleLogout} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!active) {
    return <AccessGate me={me} onChange={setMe} onLogout={handleLogout} />;
  }

  // Till operators may only open their own pages; anything else sends them to New Sale
  if (!isAdmin && !tillMayOpen(location.pathname)) {
    return <Navigate to="/sell" replace />;
  }

  const links = isAdmin ? MAIN_LINKS : TILL_ORDER.map((p) => MAIN_LINKS.find((l) => l.path === p));
  const displayName = me?.user?.name || me?.user?.email || '';
  const access = { me, role: me.staff.role, isAdmin };

  const total =
    (results?.products?.length ?? 0) +
    (results?.customers?.length ?? 0) +
    (results?.orders?.length ?? 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeMenu} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-sidebar text-white flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-lime text-sidebar flex items-center justify-center font-bold text-xs">
            MF
          </div>
          <span className="font-bold text-lg tracking-tight leading-none">
            Medi<span className="text-lime">Find</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={closeMenu}
              className={({ isActive }) => linkClass(isActive)}
            >
              <item.icon size={18} />
              <span className="flex-1">{!isAdmin && item.tillName ? item.tillName : item.name}</span>
              {item.path === '/staff' && pendingStaff > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {pendingStaff}
                </span>
              )}
            </NavLink>
          ))}

          <div className="my-3 border-t border-white/10" />

          <NavLink
            to="/help"
            onClick={closeMenu}
            className={({ isActive }) => linkClass(isActive)}
          >
            <HelpCircle size={18} />
            Help &amp; Support
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/settings"
              onClick={closeMenu}
              className={({ isActive }) => linkClass(isActive)}
            >
              <Sliders size={18} />
              Settings
            </NavLink>
          )}
        </nav>

        <div className="shrink-0 p-3 space-y-2">
          {isAdmin && (
          <div className="bg-white/10 border border-white/10 rounded-xl p-3 text-white">
            <div className="text-xs font-semibold uppercase tracking-wider mb-1">
              Upgrade to Pro
            </div>
            <div className="text-[11px] text-white/70 mb-2">
              Unlock advanced analytics and AI insights.
            </div>
            <button
              onClick={() => {
                closeMenu();
                navigate('/upgrade');
              }}
              className="w-full py-2 rounded-lg bg-lime text-sidebar text-xs font-semibold hover:bg-[#cfe85c] transition"
            >
              Go Pro
            </button>
          </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="md:pl-60 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 md:px-6 py-3 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Search */}
          <div className="relative hidden md:block w-full max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search products, orders, customers…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime focus:border-lime"
            />

            {searchOpen && query.trim().length >= 2 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
                <div className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                  {searching && (
                    <div className="px-3 py-3 text-sm text-gray-400">Searching…</div>
                  )}
                  {!searching && results && total === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-500">
                      No results for "{query.trim()}"
                    </div>
                  )}

                  {results?.products?.length > 0 && (
                    <div>
                      <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Products
                      </div>
                      {results.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => go('/products')}
                          className="block w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <div className="text-sm font-semibold text-gray-800">{p.name}</div>
                          <div className="text-xs text-gray-500">
                            {p.category} · {p.quantity} in stock · {p.status}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results?.customers?.length > 0 && (
                    <div>
                      <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Customers
                      </div>
                      {results.customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => go('/customers')}
                          className="block w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.email} · {c.total_orders} orders
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results?.orders?.length > 0 && (
                    <div>
                      <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Orders
                      </div>
                      {results.orders.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => go('/orders')}
                          className="block w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <div className="text-sm font-semibold text-gray-800">
                            {o.customer_name} · {o.product_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {o.quantity} units · ${Number(o.total || 0).toFixed(2)} ·{' '}
                            {o.order_status}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 text-gray-500 hover:text-gray-800"
              aria-label="Toggle dark mode"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className="relative p-2 text-gray-500 hover:text-gray-800"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {notifs.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {notifs.length}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Notifications
                    </div>
                    {notifs.length === 0 && (
                      <div className="px-3 py-4 text-sm text-gray-500">
                        You are all caught up.
                      </div>
                    )}
                    {notifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setBellOpen(false);
                          navigate(n.to);
                        }}
                        className="block w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <div className="text-sm font-semibold text-gray-800">{n.title}</div>
                        <div className="text-xs text-gray-500">{n.text}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            )}

            <div className="ml-1 flex max-w-[200px] items-center gap-2 rounded-full bg-lime px-3 py-1.5 text-xs font-semibold text-sidebar">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sidebar" />
              <span className="truncate">{displayName || 'Pharmacist'}</span>
              <span className="shrink-0 rounded-full bg-sidebar/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                {isAdmin ? 'Admin' : 'Till'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <ErrorBoundary fallback="The page crashed while rendering.">
            {/* each page is downloaded the first time it is opened */}
            <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading…</div>}>
              <AccessContext.Provider value={access}>
                <Outlet />
              </AccessContext.Provider>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
