import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const DEMO = { email: 'demo@medifind.app', password: 'Demo12345!' };

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/overview', { replace: true });
    });
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) navigate('/overview', { replace: true });
        else setInfo('Account created. Check your email to confirm it, then log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/overview', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const demo = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(DEMO);
    setLoading(false);
    if (error) setError('Demo account is not set up yet: ' + error.message);
    else navigate('/overview', { replace: true });
  };

  const input =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime focus:border-lime';

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-lime text-sm font-bold text-sidebar">
            MF
          </div>
          <h1 className="text-2xl font-bold text-sidebar">
            Medi<span className="text-[#7da800]">Find</span>
          </h1>
          <p className="text-sm text-gray-500">
            {mode === 'login' ? 'Log in to manage your pharmacy' : 'Create your pharmacist account'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <input
              className={input}
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className={input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={input}
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {info && (
            <div className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{info}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-lime py-3 text-sm font-semibold text-sidebar hover:bg-[#cfe85c] disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setInfo('');
          }}
          className="mt-4 w-full text-center text-sm text-gray-600 hover:text-sidebar"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          or
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          onClick={demo}
          disabled={loading}
          className="w-full rounded-xl border border-sidebar py-3 text-sm font-semibold text-sidebar hover:bg-sidebar hover:text-white disabled:opacity-60"
        >
          Continue as Demo Pharmacist
        </button>
      </div>
    </div>
  );
}