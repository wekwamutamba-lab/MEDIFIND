import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import { supabase } from '../lib/supabase';
import { getOverview } from '../lib/api';
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
  Sun,
  Moon,
} from 'lucide-react';

const MAIN_LINKS = [
  { name: 'Overview', path: '/overview', icon: Home },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Sales', path: '/sales', icon: Banknote },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Payments', path: '/payments', icon: CreditCard },
  { name: 'Restock', path: '/restock', icon: Truck },
];

const linkClass = (active) =>
  `w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition ${
    active
      ? 'bg-[#D9F26B] text-[#0F3D2E] font-semibold'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`;

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('mf_theme') === 'dark');
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const navigate = useNavigate();

  // Login check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login', { replace: true });
      } else {
        const u = data.session.user;
        setDisplayName(u.user_metadata?.full_name || u.email || '');
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

  // Notifications (built from the overview data)
  useEffect(() => {
    if (!ready) return;
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
  }, [ready]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setSidebarOpen(false);

  if (!ready) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeMenu} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#0F3D2E] text-white flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#D9F26B] text-[#0F3D2E] flex items-center justify-center font-bold text-xs">
            MF
          </div>
          <span className="font-bold text-lg tracking-tight leading-none">
            Medi<span className="text-[#D9F26B]">Find</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {MAIN_LINKS.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={closeMenu}
              className={({ isActive }) => linkClass(isActive)}
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}

          <div className="my-3 border-t border-white/10" />

          <button
            onClick={() => {
              closeMenu();
              alert('Help & Support: support@medifind.example');
            }}
            className={linkClass(false)}
          >
            <HelpCircle size={18} />
            Help &amp; Support
          </button>

          <NavLink
            to="/settings"
            onClick={closeMenu}
            className={({ isActive }) => linkClass(isActive)}
          >
            <Sliders size={18} />
            Settings
          </NavLink>
        </nav>

        <div className="shrink-0 p-3 space-y-2">
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
                alert('Pro upgrade coming soon!');
              }}
              className="w-full py-2 rounded-lg bg-[#D9F26B] text-[#0F3D2E] text-xs font-semibold hover:bg-[#cfe85c] transition"
            >
              Go Pro
            </button>
          </div>

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

          <div className="relative hidden md:block w-full max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              placeholder="Search products, orders, customers…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9F26B] focus:border-[#D9F26B]"
            />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Light / dark toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 text-gray-500 hover:text-gray-800"
              aria-label="Toggle dark mode"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications bell */}
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

            <div className="ml-1 flex max-w-[200px] items-center gap-2 rounded-full bg-[#D9F26B] px-3 py-1.5 text-xs font-semibold text-[#0F3D2E]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#0F3D2E]" />
              <span className="truncate">{displayName || 'Pharmacist'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <ErrorBoundary fallback="The page crashed while rendering.">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}