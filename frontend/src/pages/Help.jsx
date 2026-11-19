import { useState, useEffect } from 'react';
import { ChevronDown, Mail, LifeBuoy } from 'lucide-react';
import { listTickets, sendTicket } from '../lib/extra';

const FAQ = [
  {
    q: 'How does Pill, the stock assistant, work?',
    a: 'Pill reads your inventory, finds products that are low, out of stock or close to expiry, and asks an AI model to write a short summary and restock suggestions. You decide what to do with them.',
  },
  {
    q: 'How do I find a supplier for something I am running out of?',
    a: 'Open Restock and type what you need in plain words, for example "200 amoxicillin urgently". MediFind shows the suppliers that sell it, ranked by delivery time or price.',
  },
  {
    q: 'How do I add my own suppliers?',
    a: 'Open Suppliers, click Add supplier, fill in their details, then open their product list and add the medicines they sell and the prices.',
  },
  {
    q: 'What happens when I mark a restock order as received?',
    a: 'The ordered quantity is added to that medicine in your inventory, so your stock levels stay correct.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. You must log in to use the app, and only stock data and the text you type are sent to the AI. Customer and payment details are never sent to it.',
  },
  {
    q: 'Does the AI give medical advice?',
    a: 'No. MediFind is a stock management tool. The AI never gives medical advice, diagnoses or dosage guidance.',
  },
];

const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9F26B]';

export default function Help() {
  const [open, setOpen] = useState(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState([]);

  const load = async () => {
    try {
      const res = await listTickets();
      setTickets(res?.data ?? []);
    } catch {
      /* the list is optional */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setDone('');
    try {
      await sendTicket({ subject, message });
      setDone('Thanks. Your message was sent and we will get back to you by email.');
      setSubject('');
      setMessage('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F3D2E] text-[#D9F26B]">
          <LifeBuoy size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help &amp; Support</h1>
          <p className="text-sm text-gray-500">Answers to common questions, or message us</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-2 shadow-sm">
        {FAQ.map((f, i) => (
          <div key={f.q} className="border-b border-gray-100 last:border-0">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <span className="text-sm font-semibold text-gray-900">{f.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-gray-400 transition ${open === i ? 'rotate-180' : ''}`}
              />
            </button>
            {open === i && <p className="px-4 pb-4 text-sm text-gray-600">{f.a}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
          <Mail size={18} /> Contact support
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Describe the problem and we will reply to the email on your account.
        </p>

        {done && (
          <div className="mb-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{done}</div>
        )}
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            className={inputCls}
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <textarea
            className={inputCls}
            rows={5}
            placeholder="How can we help?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-[#D9F26B] px-6 py-2.5 text-sm font-semibold text-[#0F3D2E] hover:bg-[#cfe85c] disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>

      {tickets.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 font-semibold text-gray-900">Your messages</div>
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-900">{t.subject}</div>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {t.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                </div>
                <p className="mt-1 text-sm text-gray-600">{t.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}