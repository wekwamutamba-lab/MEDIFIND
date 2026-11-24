import { useEffect, useState } from 'react';
import { CalendarDays, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { getWeeklySummary } from '../lib/api';
import { waNumber } from '../lib/phone';

// Dashboard card: the last 7 days in plain words, ready to send to the owner by
// WhatsApp or email. The figures come from the pharmacy's own records
// (routes/reports.js); no AI writes them. It goes to the WhatsApp number and
// email on the Settings page.

export default function WeeklySummary() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    getWeeklySummary()
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message || 'Could not load the weekly summary'));
    return () => {
      live = false;
    };
  }, []);

  const text = data?.text || '';
  const wa = waNumber(data?.send_to?.whatsapp);
  const email = data?.send_to?.email || '';
  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
  const mailLink = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    `MediFind weekly summary (${data?.period || ''})`
  )}&body=${encodeURIComponent(text)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the text and copy it instead.');
    }
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50';

  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime/50 text-sidebar">
          <CalendarDays size={20} />
        </div>
        <div>
          <div className="font-semibold text-gray-900">This week</div>
          <div className="text-xs text-gray-500">The last 7 days in plain words, ready to send.</div>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {!data && !error && <div className="mt-4 text-sm text-gray-400">Loading…</div>}

      {data && (
        <>
          <pre className="mt-4 max-h-112 flex-1 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 font-sans text-sm leading-relaxed text-gray-800">
            {text}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={waLink} target="_blank" rel="noreferrer" className={btn}>
              <MessageCircle size={14} /> WhatsApp
            </a>
            <a href={mailLink} className={btn}>
              <Mail size={14} /> Email
            </a>
            <button onClick={copy} className={btn}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {(!wa || !email) && (
            <p className="mt-2 text-[11px] text-gray-500">
              Add your pharmacy&apos;s WhatsApp number and email in Settings to send it straight to yourself.
            </p>
          )}
        </>
      )}
    </div>
  );
}
