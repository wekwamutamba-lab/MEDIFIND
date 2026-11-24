import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { getForecast } from '../lib/api';

// Dashboard card: products that will run out soon at the rate they have been
// selling, each with a button that opens Restock with a suggested order.
// Worked out from the pharmacy's own sales (routes/reports.js), no AI.

const SHOW = 5;

export default function RunningOut() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [all, setAll] = useState(false);

  useEffect(() => {
    let live = true;
    getForecast()
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message || 'Could not load the forecast'));
    return () => {
      live = false;
    };
  }, []);

  const items = data?.items ?? [];
  const shown = all ? items : items.slice(0, SHOW);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
          <Hourglass size={20} />
        </div>
        <div>
          <div className="font-semibold text-gray-900">Running out soon</div>
          <div className="text-xs text-gray-500">
            {data
              ? `Next ${data.horizon_days} days, from how fast each item sold over the last ${data.window_days} days.`
              : 'From how fast each item has been selling.'}
          </div>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {!data && !error && <div className="mt-4 text-sm text-gray-400">Loading…</div>}
      {data && items.length === 0 && (
        <div className="mt-4 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-600">
          Nothing is expected to run out in the next {data.horizon_days} days.
        </div>
      )}

      <div className="mt-4 space-y-2">
        {shown.map((x) => (
          <div key={x.product_id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${x.days_left <= 3 ? 'text-red-700' : 'text-gray-900'}`}>
                {x.message}
              </div>
              <div className="text-xs text-gray-500">
                {x.quantity} left · sells about {x.per_day} a day · order {x.suggested_qty} for {data.cover_days} days
              </div>
            </div>
            <button
              onClick={() => navigate(`/restock?q=${encodeURIComponent(`${x.suggested_qty} ${x.name}`)}`)}
              className="shrink-0 rounded-lg bg-sidebar px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#145540]"
            >
              Find suppliers
            </button>
          </div>
        ))}
      </div>
      {items.length > SHOW && (
        <button onClick={() => setAll((v) => !v)} className="mt-3 text-xs font-semibold text-sidebar underline">
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}
