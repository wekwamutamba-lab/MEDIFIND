import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Package,
  Receipt,
  ShoppingCart,
  Banknote,
  Users,
  Truck,
  UserCog,
  Sliders,
  Home,
  HelpCircle,
} from 'lucide-react';
import { TOUR_EVENT } from '../lib/tour';

// Welcome tour: shown once, the first time someone logs in, so they can see how
// MediFind works without reading the README. Each step opens the real page and
// highlights it in the sidebar. "Show me around" on Help & Support starts it again.

const ADMIN_STEPS = [
  {
    path: '/overview',
    icon: Sparkles,
    title: 'Welcome to MediFind',
    text: 'This short tour shows where everything is and what to do first. It takes about a minute. You can replay it any time from Help & Support.',
  },
  {
    path: '/products',
    icon: Package,
    title: '1. Add your medicines',
    text: 'Start here. Add each medicine with its stock, expiry date, selling price and cost price (what you pay for one). The cost price is how MediFind works out your real profit.',
  },
  {
    path: '/sell',
    icon: Receipt,
    title: '2. Make a sale',
    text: 'Type a medicine name in the search box under Current sale, or type the whole sale in one line, like "2 paracetamol and 1 amoxicillin for Tendai", and press Enter. Check the lines, add the customer and payment, then press Complete sale.',
  },
  {
    path: '/orders',
    icon: ShoppingCart,
    title: '3. See every order',
    text: 'All sales are listed here, newest first. Use the pencil to mark a pending order Completed or Cancelled. On a small screen, slide the table left and right to see every column.',
  },
  {
    path: '/sales',
    icon: Banknote,
    title: '4. Follow your money',
    text: 'Revenue, profit, cost and your busiest days and hours. The figures update on their own as sales come in.',
  },
  {
    path: '/customers',
    icon: Users,
    title: '5. Know your customers',
    text: 'Customers are saved when you sell to them on New Sale, with their phone, email and what they have bought.',
  },
  {
    path: '/restock',
    icon: Truck,
    title: '6. Restock',
    text: 'Type what you need, like "200 amoxicillin urgently", to compare suppliers by price and delivery time. When the order arrives, press Mark received: the stock goes up and the cost price is updated.',
  },
  {
    path: '/staff',
    icon: UserCog,
    title: '7. Your team',
    text: 'People who ask to join your pharmacy wait here for you to approve them. Make someone an admin, or a till operator who only sells and looks things up.',
  },
  {
    path: '/settings',
    icon: Sliders,
    title: '8. Settings',
    text: 'Set when stock counts as low, how early to warn about expiry, and your pharmacy\'s WhatsApp number and email for the weekly report.',
  },
  {
    path: '/overview',
    icon: Home,
    title: '9. Your dashboard and Pill',
    text: 'Back on the dashboard, press Generate Insights. Pill, your stock assistant, tells you what will run out, how much to order and how the week went, with a weekly report you can send yourself by WhatsApp or email.',
  },
];

const TILL_STEPS = [
  {
    path: '/sell',
    icon: Sparkles,
    title: 'Welcome to MediFind',
    text: 'This short tour shows you how to sell and look things up. You can replay it any time from Help & Support.',
  },
  {
    path: '/sell',
    icon: Receipt,
    title: '1. Make a sale',
    text: 'Type a medicine name in the search box under Current sale and pick it, or type the whole sale in one line, like "2 paracetamol and 1 amoxicillin for Tendai", and press Enter. Check each line, add the customer and payment, then press Complete sale.',
  },
  {
    path: '/products',
    icon: Package,
    title: '2. Check price and stock',
    text: 'Look up any medicine to see its price, how many are left and when it expires.',
  },
  {
    path: '/customers',
    icon: Users,
    title: '3. Find a customer',
    text: 'Customers are saved when you sell to them. Search here for their phone number or what they bought before.',
  },
  {
    path: '/orders',
    icon: ShoppingCart,
    title: '4. Your sales',
    text: 'Every sale you made is listed here. On a small screen, slide the table left and right to see every column.',
  },
  {
    path: '/help',
    icon: HelpCircle,
    title: 'Need help?',
    text: 'Answers to common questions are on Help & Support, and you can send a message to the MediFind team from there.',
  },
];

const doneKey = (userId) => `mf_tour_done:${userId || 'me'}`;

export default function Tour({ userId, isAdmin }) {
  const navigate = useNavigate();
  const steps = isAdmin ? ADMIN_STEPS : TILL_STEPS;
  // first login: no "done" mark saved for this person on this device yet
  const [index, setIndex] = useState(() =>
    localStorage.getItem(doneKey(userId)) ? null : 0
  );
  const [box, setBox] = useState(null);
  const step = index == null ? null : steps[index];

  useEffect(() => {
    const again = () => setIndex(0);
    window.addEventListener(TOUR_EVENT, again);
    return () => window.removeEventListener(TOUR_EVENT, again);
  }, []);

  // open the step's page
  useEffect(() => {
    if (step) navigate(step.path);
  }, [step, navigate]);

  // ring around the step's sidebar link (hidden on phones, where the sidebar is closed)
  const measure = useCallback(() => {
    const el = step && document.querySelector(`[data-tour="${step.path}"]`);
    const r = el?.getBoundingClientRect();
    setBox(r && r.width > 0 && r.left >= 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
  }, [step]);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const finish = () => {
    localStorage.setItem(doneKey(userId), new Date().toISOString());
    setIndex(null);
  };

  if (!step) return null;
  const last = index === steps.length - 1;
  const Icon = step.icon;

  return (
    <>
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] rounded-xl ring-4 ring-lime ring-offset-2 ring-offset-sidebar transition-all duration-300"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      )}
      <div
        role="dialog"
        aria-label="Welcome tour"
        className="fixed bottom-4 left-4 right-4 z-[60] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:left-auto sm:w-[24rem]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar text-lime">
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Step {index + 1} of {steps.length}
            </div>
            <div className="font-bold text-gray-900">{step.title}</div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{step.text}</p>

        <div className="mt-4 flex gap-1" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-sidebar' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={finish} className="text-xs font-medium text-gray-500 hover:text-gray-800">
            {last ? 'Close' : 'Skip tour'}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex(index - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? finish() : setIndex(index + 1))}
              className="rounded-lg bg-lime px-4 py-1.5 text-sm font-semibold text-sidebar hover:bg-[#cfe85c]"
            >
              {last ? 'Start using MediFind' : index === 0 ? 'Show me around' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
