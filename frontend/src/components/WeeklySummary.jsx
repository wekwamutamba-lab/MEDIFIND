import { useState } from 'react';
import { CalendarDays, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { waNumber } from '../lib/phone';

// Weekly report, shown in Pill's results on the dashboard when "Generate Insights"
// is pressed: the last 7 days in plain words, ready to send to the owner by
// WhatsApp or email. `data` is GET /api/reports/weekly. The figures come from the
// pharmacy's own records (routes/reports.js); no AI writes them. It goes to the
// WhatsApp number and email on the Settings page.

export default function WeeklySummary({ data }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

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
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <CalendarDays size={14} /> Weekly report{data?.period ? `: ${data.period}` : ''}
      </div>
      {error && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <pre className="max-h-112 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 p-4 font-sans text-sm leading-relaxed text-gray-800">
        {text}
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Send it to yourself:</span>
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
    </div>
  );
}
