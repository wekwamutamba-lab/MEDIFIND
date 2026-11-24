import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Eye, EyeOff, Boxes, Truck, Sparkles, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Left panel: photos and benefits. The photos live in public/onboarding/ (free Unsplash
// licence, credits in public/onboarding/CREDITS.txt). If a photo is missing, the panel
// still looks right: it falls back to the green background.
const SLIDES = [
  {
    img: '/onboarding/pharmacist.jpg',
    icon: Boxes,
    title: 'Live stock tracking',
    text: 'See what is in stock, running low or close to expiry the moment it changes.',
  },
  {
    img: '/onboarding/shelf.jpg',
    icon: Truck,
    title: 'Fast restocking',
    text: 'Compare suppliers and send a stock request by WhatsApp or email in a few taps.',
  },
  {
    img: '/onboarding/pills.jpg',
    icon: Sparkles,
    title: 'AI that tells you what to reorder',
    text: 'Pill, your stock assistant, points out what to restock first and what is about to expire.',
  },
  {
    img: '/onboarding/bottle.jpg',
    icon: Users,
    title: 'Sales tracked per till',
    text: 'Every sale records who made it, and each cashier only sees what they need.',
  },
];

const TABS = [
  { id: 'login', label: 'Log in' },
  { id: 'join', label: 'Create account' },
  { id: 'register', label: 'Register pharmacy' },
];

const RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'A number', test: (p) => /\d/.test(p) },
  { id: 'sym', label: 'A symbol (optional, makes it stronger)', test: (p) => /[^A-Za-z0-9]/.test(p), optional: true },
];

const passwordOk = (p) => RULES.filter((r) => !r.optional).every((r) => r.test(p));

function strength(p) {
  const passed = RULES.filter((r) => r.test(p)).length;
  if (!p) return { label: '', bars: 0, color: 'bg-gray-200' };
  if (passed <= 2) return { label: 'Weak', bars: 1, color: 'bg-red-500' };
  if (passed === 3) return { label: 'Fair', bars: 2, color: 'bg-amber-500' };
  if (passed === 4) return { label: 'Good', bars: 3, color: 'bg-lime' };
  return { label: 'Strong', bars: 4, color: 'bg-green-600' };
}

const input =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime focus:border-lime';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({ value, onChange, showMeter, autoComplete }) {
  const [show, setShow] = useState(false);
  const s = strength(value);
  return (
    <div>
      <div className="relative">
        <input
          className={`${input} pr-11`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showMeter && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= s.bars ? s.color : 'bg-gray-200'}`} />
              ))}
            </div>
            <span className="w-14 text-right text-xs font-semibold text-gray-600" aria-live="polite">
              {s.label}
            </span>
          </div>
          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {RULES.map((r) => {
              const ok = r.test(value);
              return (
                <li key={r.id} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-700' : 'text-gray-500'}`}>
                  {ok ? <Check size={14} /> : <X size={14} className="text-gray-400" />}
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Slides() {
  const [i, setI] = useState(0);
  const [failed, setFailed] = useState({});

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:w-1/2 xl:w-[55%]">
      {SLIDES.map((s, n) =>
        failed[n] ? null : (
          <img
            key={s.img}
            src={s.img}
            alt=""
            // lazy: phones hide this panel, so they skip downloading the photos
            loading="lazy"
            decoding="async"
            onError={() => setFailed((f) => ({ ...f, [n]: true }))}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              n === i ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      )}
      {/* darkens the photo so the text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-sidebar/30" />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 text-white xl:p-14">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime text-sm font-bold text-sidebar">MF</div>
          <span className="text-xl font-bold tracking-tight">
            Medi<span className="text-lime">Find</span>
          </span>
        </div>

        <div className="max-w-lg">
          <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
            Run your pharmacy from one place
          </h2>
          <div className="relative mt-8 min-h-[120px]">
            {SLIDES.map((s, n) => (
              <div
                key={s.title}
                className={`absolute inset-0 transition-opacity duration-700 ${n === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                aria-hidden={n !== i}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-lime/90 text-sidebar">
                  <s.icon size={22} />
                </div>
                <div className="text-lg font-semibold text-white">{s.title}</div>
                <p className="mt-1 text-sm text-white/80">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            {SLIDES.map((s, n) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setI(n)}
                className={`h-2 rounded-full transition-all ${n === i ? 'w-8 bg-lime' : 'w-2 bg-white/40 hover:bg-white/70'}`}
                aria-label={`Show: ${s.title}`}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-white/50"></p>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    join_code: '',
    pharmacy_name: '',
    license_number: '',
    whatsapp: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === 'string' ? v : v.target.value }));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/overview', { replace: true });
    });
  }, [navigate]);

  const switchTab = (id) => {
    setTab(id);
    setError('');
    setInfo('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (tab !== 'login') {
      if (!passwordOk(form.password)) {
        setError('Please choose a stronger password: see the checklist under the password box.');
        return;
      }
      if (tab === 'register') {
        const digits = form.whatsapp.replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 15) {
          setError('The WhatsApp number must have 9 to 15 digits');
          return;
        }
      }
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (err) throw err;
        navigate('/overview', { replace: true });
        return;
      }

      // What they typed is saved with the account; the backend turns it into a
      // request for the admin to approve the first time they are logged in.
      const data =
        tab === 'join'
          ? { full_name: form.name.trim(), signup_type: 'join', join_code: form.join_code.trim() }
          : {
              full_name: form.name.trim(),
              signup_type: 'register',
              pharmacy_name: form.pharmacy_name.trim(),
              license_number: form.license_number.trim(),
              whatsapp: form.whatsapp.trim(),
              address: form.address.trim(),
            };

      const { data: res, error: err } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data },
      });
      if (err) throw err;
      if (res.session) navigate('/overview', { replace: true });
      else {
        setInfo('Account created. Check your email to confirm it, then log in here.');
        setTab('login');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const heading = {
    login: ['Welcome back', 'Log in to your pharmacy.'],
    join: ['Join your pharmacy', 'Ask your pharmacy admin for the join code. They approve your account before you can start.'],
    register: ['Register a pharmacy', 'Your pharmacy gets its own private space with you as its admin. MediFind checks each new pharmacy before it opens.'],
  }[tab];

  return (
    <div className="flex min-h-screen bg-white">
      <Slides />

      <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:px-8">
        <div className="w-full max-w-md">
          {/* logo for phones, where the left panel is hidden */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime text-sm font-bold text-sidebar">MF</div>
            <span className="text-xl font-bold tracking-tight text-sidebar">
              Medi<span className="text-[#7da800]">Find</span>
            </span>
          </div>

          <div role="tablist" className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => switchTab(t.id)}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                  tab === t.id ? 'bg-white text-sidebar shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-sidebar">{heading[0]}</h1>
          <p className="mb-6 mt-1 text-sm text-gray-500">{heading[1]}</p>

          <form onSubmit={submit} className="space-y-4">
            {tab !== 'login' && (
              <Field label="Your full name">
                <input className={input} value={form.name} onChange={set('name')} autoComplete="name" required />
              </Field>
            )}

            <Field label="Email">
              <input className={input} type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </Field>

            <Field label="Password">
              <PasswordInput
                value={form.password}
                onChange={set('password')}
                showMeter={tab !== 'login'}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>

            {tab === 'join' && (
              <Field label="Pharmacy join code">
                <input
                  className={`${input} font-mono uppercase tracking-widest`}
                  value={form.join_code}
                  onChange={set('join_code')}
                  placeholder="e.g. K7PM2QXA"
                  autoComplete="off"
                  required
                />
              </Field>
            )}

            {tab === 'register' && (
              <>
                <Field label="Pharmacy name">
                  <input className={input} value={form.pharmacy_name} onChange={set('pharmacy_name')} autoComplete="organization" required />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Licence number">
                    <input className={input} value={form.license_number} onChange={set('license_number')} required />
                  </Field>
                  <Field label="WhatsApp number">
                    <input
                      className={input}
                      type="tel"
                      value={form.whatsapp}
                      onChange={set('whatsapp')}
                      placeholder="+263 77 123 4567"
                      autoComplete="tel"
                      required
                    />
                  </Field>
                </div>
                <Field label="Pharmacy address">
                  <input className={input} value={form.address} onChange={set('address')} autoComplete="street-address" required />
                </Field>
              </>
            )}

            {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {info && <div className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{info}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-lime py-3 text-sm font-semibold text-sidebar hover:bg-[#cfe85c] disabled:opacity-60"
            >
              {loading
                ? 'Please wait…'
                : tab === 'login'
                  ? 'Log in'
                  : tab === 'join'
                    ? 'Create account and ask to join'
                    : 'Register pharmacy'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
