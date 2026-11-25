import { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw, UserCheck, UserX, ShieldCheck, Store } from 'lucide-react';
import { getStaff, updateStaff, newJoinCode, getRegistrations, decideRegistration } from '../lib/api';
import { useAccess } from '../lib/access';

const ROLE_LABEL = { admin: 'Admin', till: 'Till operator' };
const STATUS_STYLE = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-gray-200 text-gray-700',
  rejected: 'bg-red-100 text-red-700',
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Badge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[status] || ''}`}>
      {status}
    </span>
  );
}

// New pharmacy registrations, shown only to MediFind platform owners. Approving
// creates a separate pharmacy for the person; the owner never sees its data.
function Registrations() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () =>
    getRegistrations()
      .then((res) => { setRows(res.data || []); setError(''); })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const decide = async (r, decision) => {
    const name = r.pharmacy_name || 'this pharmacy';
    const text = decision === 'approve'
      ? `Open ${name} for ${r.full_name || r.email}? They become its admin. You will not be able to see its data.`
      : `Decline ${name}?`;
    if (!window.confirm(text)) return;
    setBusy(r.id);
    setError('');
    try {
      await decideRegistration(r.id, decision);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const waiting = (rows || []).filter((r) => r.status === 'pending');
  const declined = (rows || []).filter((r) => r.status === 'rejected');
  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50';

  return (
    <section className="space-y-3 rounded-2xl border border-sidebar/20 bg-sidebar/5 p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Store size={18} /> New pharmacy registrations {waiting.length > 0 && <span className="text-amber-600">({waiting.length})</span>}
        </h2>
        <p className="text-xs text-gray-500">
          You see this because you can approve new pharmacies on MediFind. Approving one opens a separate pharmacy with this
          person as its admin. Its stock, sales and staff stay private to that pharmacy.
        </p>
      </div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {rows === null && !error && <div className="text-sm text-gray-400">Loading…</div>}
      {rows && waiting.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-center text-sm text-gray-500">No registrations waiting.</div>
      )}
      {waiting.map((r) => (
        <div key={r.id} className="rounded-xl border border-amber-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 text-sm">
              <div className="font-semibold text-gray-900">{r.pharmacy_name || 'Pharmacy name not given'}</div>
              <div className="text-gray-600">{r.full_name || '—'} · <span className="break-all">{r.email}</span></div>
              <div className="mt-1 grid gap-x-4 text-xs text-gray-500 sm:grid-cols-2">
                <div>Licence: {r.license_number || '—'}</div>
                <div>WhatsApp: {r.whatsapp || '—'}</div>
                <div className="sm:col-span-2">Address: {r.address || '—'}</div>
                <div>Asked {fmtDate(r.created_at)}</div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" disabled={busy === r.id} onClick={() => decide(r, 'approve')} className={`${btn} bg-lime text-sidebar hover:bg-[#cfe85c]`}>
                <Check size={14} /> Approve pharmacy
              </button>
              <button type="button" disabled={busy === r.id} onClick={() => decide(r, 'decline')} className={`${btn} border border-red-200 text-red-700 hover:bg-red-50`}>
                <UserX size={14} /> Decline
              </button>
            </div>
          </div>
        </div>
      ))}
      {declined.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Declined ({declined.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {declined.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span>{r.pharmacy_name || '—'} · <span className="break-all">{r.email}</span></span>
                {/* undo a decline made by mistake */}
                <button type="button" disabled={busy === r.id} onClick={() => decide(r, 'approve')} className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
                  <Check size={12} /> Approve after all
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default function Staff() {
  const { me } = useAccess();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(''); // id of the row being saved, or 'code'
  const [copied, setCopied] = useState(false);

  const load = () =>
    getStaff()
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const change = async (person, body, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(person.id);
    setError('');
    try {
      await updateStaff(person.id, body);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const regenerate = async () => {
    if (!window.confirm('Make a new join code? The old code stops working. People already approved are not affected.')) return;
    setBusy('code');
    try {
      const res = await newJoinCode();
      setData((d) => ({ ...d, join_code: res.join_code }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the code is on screen to copy by hand */
    }
  };

  if (!data && !error) return <div className="py-16 text-center text-sm text-gray-400">Loading…</div>;

  const staff = data?.staff ?? [];
  const pending = staff.filter((s) => s.status === 'pending');
  const others = staff.filter((s) => s.status !== 'pending');
  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <p className="mt-1 text-sm text-gray-500">
          Approve new accounts and choose what each person can do. Till operators can make sales, look up products and
          customers, and see their own sales. Admins can do everything.
        </p>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {me?.platform_owner && <Registrations />}

      {data && (
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">Join code</div>
            <p className="text-xs text-gray-500">
              Give this to new staff. They enter it under "Create account", then you approve them here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-gray-100 px-4 py-2 font-mono text-lg font-bold tracking-widest text-sidebar">
              {data.join_code}
            </span>
            <button type="button" onClick={copy} className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={regenerate}
              disabled={busy === 'code'}
              className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
            >
              <RefreshCw size={14} /> New code
            </button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Waiting for approval {pending.length > 0 && <span className="text-amber-600">({pending.length})</span>}
        </h2>
        {pending.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
            Nobody is waiting right now.
          </div>
        )}
        {pending.map((p) => (
          <div key={p.id} className="rounded-2xl border border-amber-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">{p.full_name || p.email}</div>
                <div className="truncate text-sm text-gray-500">{p.email}</div>
                <div className="mt-1 text-xs text-gray-500">
                  Asked {fmtDate(p.created_at)} to join with your join code
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => change(p, { status: 'active', role: 'till' })}
                  className={`${btn} bg-lime text-sidebar hover:bg-[#cfe85c]`}
                >
                  <UserCheck size={14} /> Approve as till operator
                </button>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() =>
                    change(p, { status: 'active', role: 'admin' }, `Make ${p.full_name || p.email} an admin? Admins can see and change everything.`)
                  }
                  className={`${btn} border border-sidebar text-sidebar hover:bg-sidebar hover:text-white`}
                >
                  <ShieldCheck size={14} /> Approve as admin
                </button>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => change(p, { status: 'rejected' }, `Decline ${p.full_name || p.email}?`)}
                  className={`${btn} border border-red-200 text-red-700 hover:bg-red-50`}
                >
                  <UserX size={14} /> Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Everyone</h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Since</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {others.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No one yet.</td>
                </tr>
              )}
              {others.map((p) => {
                const isMe = p.id === data.me;
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {p.full_name || p.email} {isMe && <span className="text-xs text-gray-400">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-500">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isMe || p.status !== 'active' ? (
                        ROLE_LABEL[p.role]
                      ) : (
                        <select
                          value={p.role}
                          disabled={busy === p.id}
                          onChange={(e) => change(p, { role: e.target.value })}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                          aria-label={`Role for ${p.full_name || p.email}`}
                        >
                          <option value="till">Till operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(p.decided_at || p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {isMe ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : p.status === 'active' ? (
                        <button
                          type="button"
                          disabled={busy === p.id}
                          onClick={() => change(p, { status: 'suspended' }, `Suspend ${p.full_name || p.email}? They will not be able to use MediFind until you reactivate them.`)}
                          className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy === p.id}
                          onClick={() => change(p, { status: 'active' })}
                          className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
                        >
                          {p.status === 'rejected' ? 'Approve' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
