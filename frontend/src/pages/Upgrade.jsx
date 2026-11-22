import { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

const FREE = [
  'Inventory, orders, customers and payments',
  'Dashboard and sales analytics',
  'Pill AI stock insights',
  'AI supplier search',
];

const PRO = [
  'Everything in Free',
  'Multi-store stock management',
  'Low-stock alerts by SMS and email',
  'Export reports to PDF and Excel',
  'Priority supplier pricing',
];

export default function Upgrade() {
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setPlan(data?.user?.user_metadata?.plan === 'pro' ? 'pro' : 'free');
      setLoading(false);
    });
  }, []);

  const change = async (next) => {
    setSaving(true);
    setError('');
    setMessage('');
    const { error: err } = await supabase.auth.updateUser({ data: { plan: next } });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPlan(next);
    setMessage(
      next === 'pro'
        ? 'You are now on MediFind Pro. This is a demo, so no payment was taken.'
        : 'You are back on the Free plan.'
    );
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plans and pricing</h1>
        <p className="text-sm text-gray-500">
          Choose the plan that fits your pharmacy. Demo mode: no real payment is taken.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-gray-900">Free</div>
            {plan === 'free' && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Current plan
              </span>
            )}
          </div>
          <div className="mt-2 text-4xl font-bold text-gray-900">
            $0<span className="text-base font-normal text-gray-500"> / month</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">For a single pharmacy getting started.</p>
          <ul className="my-5 space-y-3 text-sm text-gray-700">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => change('free')}
            disabled={saving || plan === 'free'}
            className="mt-auto rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {plan === 'free' ? 'You are on Free' : 'Switch to Free'}
          </button>
        </div>

        {/* Pro */}
        <div className="flex flex-col rounded-2xl bg-sidebar p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Sparkles size={18} className="text-lime" /> Pro
            </div>
            {plan === 'pro' && (
              <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-sidebar">
                Current plan
              </span>
            )}
          </div>
          <div className="mt-2 text-4xl font-bold">
            $15<span className="text-base font-normal text-white/60"> / month</span>
          </div>
          <p className="mt-1 text-sm text-white/70">For growing pharmacies with more than one store.</p>
          <ul className="my-5 space-y-3 text-sm">
            {PRO.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-lime" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => change('pro')}
            disabled={saving || plan === 'pro'}
            className="mt-auto rounded-xl bg-lime py-2.5 text-sm font-semibold text-sidebar hover:bg-[#cfe85c] disabled:opacity-60"
          >
            {saving ? 'Please wait…' : plan === 'pro' ? 'You are on Pro' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        In a real launch, payments would go through a local provider such as Paynow or EcoCash, and
        the Pro features marked above would be unlocked automatically.
      </p>
    </div>
  );
}