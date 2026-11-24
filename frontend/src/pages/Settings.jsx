import { useEffect, useState } from 'react';
import { Store, PackageCheck, UserCog, Check, Loader2 } from 'lucide-react';
import { getSettings, updateSettings } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAccess } from '../lib/access';

// Settings (admin only). Saved in the pharmacy_settings table through PUT /api/settings.
// The stock rules change what counts as Low Stock and Expires soon across the app.

const TABS = [
  { key: 'pharmacy', label: 'Pharmacy', icon: Store },
  { key: 'stock', label: 'Stock rules', icon: PackageCheck },
  { key: 'account', label: 'Account', icon: UserCog },
];

const PROFILE_FIELDS = [
  { key: 'pharmacy_name', label: 'Pharmacy name', help: 'The name of your pharmacy', autoComplete: 'organization' },
  { key: 'pharmacist_name', label: 'Pharmacist in charge', help: 'Full name' },
  { key: 'license_number', label: 'Licence number', help: 'Your MCAZ pharmacy licence' },
  { key: 'phone', label: 'Phone', help: 'Main pharmacy number', type: 'tel', placeholder: '+263 24 2123456' },
  { key: 'whatsapp', label: 'WhatsApp', help: 'For messages to suppliers', type: 'tel', placeholder: '+263 77 123 4567' },
  { key: 'email', label: 'Email', help: 'Pharmacy email address', type: 'email' },
  { key: 'address', label: 'Address', help: 'Street address', autoComplete: 'street-address' },
  { key: 'city', label: 'City', help: 'For example Harare' },
];

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
];

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-lime';

// One setting: label and help on the left, the input on the right. Stacks on phones.
function Field({ label, help, htmlFor, children }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-900">{label}</label>
        {help && <p className="text-xs text-gray-500">{help}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Notice({ kind, children }) {
  if (!children) return null;
  const style = kind === 'ok'
    ? 'border-green-200 bg-green-50 text-green-800'
    : 'border-red-200 bg-red-50 text-red-700';
  return <div className={`rounded-lg border px-3 py-2 text-sm ${style}`}>{children}</div>;
}

function SaveBar({ saving, label = 'Save changes' }) {
  return (
    <div className="flex justify-end border-t border-gray-100 pt-4">
      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-5 py-2.5 text-sm font-semibold text-sidebar transition hover:bg-[#d4ec5f] disabled:opacity-60 sm:w-auto"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('pharmacy');
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ kind: '', text: '' });

  const load = async () => {
    setLoadError('');
    try {
      const s = await getSettings();
      setForm({
        ...Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, s?.[f.key] ?? ''])),
        low_stock_threshold: s?.low_stock_threshold ?? 20,
        expiry_warning_days: s?.expiry_warning_days ?? 30,
      });
    } catch (err) {
      setLoadError(err.message || 'Could not load the settings');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchTab = (key) => {
    setTab(key);
    setNotice({ kind: '', text: '' });
  };

  const save = async (fields) => {
    setSaving(true);
    setNotice({ kind: '', text: '' });
    try {
      const body = Object.fromEntries(fields.map((k) => [k, form[k]]));
      const saved = await updateSettings(body);
      setForm((f) => ({ ...f, ...Object.fromEntries(fields.map((k) => [k, saved?.[k] ?? f[k]])) }));
      setNotice({ kind: 'ok', text: 'Saved.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message || 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Your pharmacy details, stock rules and account.</p>
      </div>

      {/* Tabs: scroll sideways on narrow screens instead of squashing */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div role="tablist" className="inline-flex min-w-full gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:min-w-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => switchTab(t.key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
                tab === t.key ? 'bg-sidebar text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <t.icon size={16} className={tab === t.key ? 'text-lime' : 'text-current'} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        {tab === 'account' ? (
          <AccountTab />
        ) : loadError ? (
          <div className="space-y-3">
            <Notice kind="error">{loadError}</Notice>
            <button type="button" onClick={load} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Try again
            </button>
          </div>
        ) : !form ? (
          <div className="flex items-center gap-2 py-8 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading settings…</div>
        ) : tab === 'pharmacy' ? (
          <form onSubmit={(e) => { e.preventDefault(); save(PROFILE_FIELDS.map((f) => f.key)); }}>
            <h2 className="text-base font-semibold text-gray-900">Pharmacy profile</h2>
            <p className="text-sm text-gray-500">Shown to your staff and used when you contact suppliers.</p>
            <div className="mt-2 divide-y divide-gray-100">
              {PROFILE_FIELDS.map((f) => (
                <Field key={f.key} label={f.label} help={f.help} htmlFor={`s-${f.key}`}>
                  <input
                    id={`s-${f.key}`}
                    type={f.type || 'text'}
                    className={inputClass}
                    value={form[f.key]}
                    onChange={set(f.key)}
                    placeholder={f.placeholder}
                    autoComplete={f.autoComplete}
                    maxLength={200}
                  />
                </Field>
              ))}
            </div>
            <div className="space-y-3">
              <Notice kind={notice.kind}>{notice.text}</Notice>
              <SaveBar saving={saving} />
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); save(['low_stock_threshold', 'expiry_warning_days']); }}>
            <h2 className="text-base font-semibold text-gray-900">Stock rules</h2>
            <p className="text-sm text-gray-500">These decide what is marked Low Stock and Expires soon on every page, and what Pill looks at.</p>
            <div className="mt-2 divide-y divide-gray-100">
              <Field label="Low stock level" help="A product is Low Stock when it has fewer units than this" htmlFor="s-low">
                <div className="flex items-center gap-2">
                  <input id="s-low" type="number" min="1" max="10000" step="1" required className={inputClass}
                    value={form.low_stock_threshold} onChange={set('low_stock_threshold')} />
                  <span className="shrink-0 text-sm text-gray-500">units</span>
                </div>
              </Field>
              <Field label="Expiry warning" help="Stock is marked Expires soon this many days before its expiry date" htmlFor="s-exp">
                <div className="flex items-center gap-2">
                  <input id="s-exp" type="number" min="1" max="365" step="1" required className={inputClass}
                    value={form.expiry_warning_days} onChange={set('expiry_warning_days')} />
                  <span className="shrink-0 text-sm text-gray-500">days</span>
                </div>
              </Field>
            </div>
            <div className="space-y-3">
              <Notice kind={notice.kind}>{notice.text}</Notice>
              <SaveBar saving={saving} />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AccountTab() {
  const { me, role } = useAccess();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ kind: '', text: '' });

  const ok = PASSWORD_RULES.every((r) => r.test(password));

  const change = async (e) => {
    e.preventDefault();
    setNotice({ kind: '', text: '' });
    if (!ok) return setNotice({ kind: 'error', text: 'The new password does not meet the rules below.' });
    if (password !== confirm) return setNotice({ kind: 'error', text: 'The two passwords do not match.' });
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirm('');
      setNotice({ kind: 'ok', text: 'Password changed. Use the new one next time you log in.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message || 'Could not change the password' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">Your account</h2>
      <div className="mt-2 divide-y divide-gray-100">
        <Field label="Name"><p className="break-words text-sm text-gray-700">{me?.user?.name || '—'}</p></Field>
        <Field label="Email" help="Used to log in"><p className="break-all text-sm text-gray-700">{me?.user?.email || '—'}</p></Field>
        <Field label="Role"><p className="text-sm text-gray-700">{role === 'admin' ? 'Admin' : 'Till operator'}</p></Field>
      </div>

      <form onSubmit={change} className="mt-6 border-t border-gray-100 pt-4">
        <h2 className="text-base font-semibold text-gray-900">Change password</h2>
        <div className="mt-2 divide-y divide-gray-100">
          <Field label="New password" htmlFor="s-pw">
            <input id="s-pw" type="password" autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password" htmlFor="s-pw2">
            <input id="s-pw2" type="password" autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        </div>
        <ul className="mb-4 grid gap-1 text-xs sm:grid-cols-2">
          {PASSWORD_RULES.map((r) => (
            <li key={r.label} className={r.test(password) ? 'text-green-700' : 'text-gray-500'}>
              {r.test(password) ? '✓' : '•'} {r.label}
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          <Notice kind={notice.kind}>{notice.text}</Notice>
          <SaveBar saving={saving} label="Change password" />
        </div>
      </form>
    </div>
  );
}
