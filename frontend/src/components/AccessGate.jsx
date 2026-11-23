import { useState } from 'react';
import { Clock, ShieldX, KeyRound, LogOut, RefreshCw } from 'lucide-react';
import { getMe, joinPharmacy } from '../lib/api';

// Shown instead of the app to anyone who is logged in but not (yet) approved.
export default function AccessGate({ me, onChange, onLogout }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const status = me?.staff?.status || 'none';

  const refresh = async () => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const next = await getMe();
      onChange(next);
      if (next?.staff?.status === status) setNote('No change yet. Your admin has not approved you so far.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onChange(await joinPharmacy({ join_code: code }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const view = {
    none: {
      Icon: KeyRound,
      title: 'Enter your pharmacy join code',
      text: 'Your account is not linked to a pharmacy yet. Ask your pharmacy admin for the join code: they will find it on their Staff page.',
    },
    pending: {
      Icon: Clock,
      title: 'Waiting for approval from your pharmacy admin',
      text:
        me?.staff?.requested_role === 'admin'
          ? 'You asked to be a pharmacy admin. An existing admin needs to approve you. You can close this page and come back later.'
          : 'Your request to join has been sent. Your admin needs to approve you before you can start. You can close this page and come back later.',
    },
    rejected: {
      Icon: ShieldX,
      title: 'Your request was declined',
      text: 'Your pharmacy admin declined this account. If you think this is a mistake, speak to them.',
    },
    suspended: {
      Icon: ShieldX,
      title: 'Your account is suspended',
      text: 'Your pharmacy admin has suspended this account. Speak to them to get access again.',
    },
  }[status] || {};
  const Icon = view.Icon || Clock;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime text-sidebar">
          <Icon size={28} />
        </div>
        <h1 className="text-center text-xl font-bold text-sidebar">{view.title}</h1>
        <p className="mt-2 text-center text-sm text-gray-500">{view.text}</p>
        {me?.user?.email && (
          <p className="mt-3 text-center text-xs text-gray-400">Logged in as {me.user.email}</p>
        )}

        {status === 'none' && (
          <form onSubmit={join} className="mt-6 space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Join code"
              autoComplete="off"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-mono text-lg uppercase tracking-widest focus:border-lime focus:outline-none focus:ring-2 focus:ring-lime"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-lime py-3 text-sm font-semibold text-sidebar hover:bg-[#cfe85c] disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Ask to join'}
            </button>
          </form>
        )}

        {status === 'pending' && (
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3 text-sm font-semibold text-sidebar hover:bg-[#cfe85c] disabled:opacity-60"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
            Check again
          </button>
        )}

        {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {note && <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-center text-sm text-gray-600">{note}</div>}

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  );
}
