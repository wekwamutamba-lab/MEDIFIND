import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Truck, Phone, MapPin, DollarSign, ShieldAlert } from 'lucide-react';
import { findMedicine, createOrder } from '../lib/api';

export default function Find() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveMedicine, setReserveMedicine] = useState(null);
  const [reserveName, setReserveName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await findMedicine(query);
      setResults(res);
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!reserveName.trim()) return;
    setSubmitting(true);
    try {
      await createOrder({
        customerName: reserveName,
        medicine: reserveMedicine.medicine,
        quantity: 1,
        total: reserveMedicine.price,
        status: 'Pending',
        paymentStatus: 'Unpaid',
      });
      setSuccess(reserveMedicine.medicine);
      setReserveOpen(false);
      setReserveName('');
    } catch (err) {
      setError(err.message || 'Reservation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const urgencyColor = (u) =>
    u === 'High' ? 'text-red-600 bg-red-100 border-red-200' :
    u === 'Medium' ? 'text-amber-600 bg-amber-100 border-amber-200' :
    'text-emerald-600 bg-emerald-100 border-emerald-200';

  return (
    <div className="min-h-screen bg-[#0F3D2E] text-white">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#D9F26B] text-[#0F3D2E] flex items-center justify-center font-bold text-lg">
              MF
            </div>
            <span className="text-xl font-bold tracking-tight">
              Medi<span className="text-[#D9F26B]">Find</span>
            </span>
          </div>
          <Link to="/login" className="text-xs text-[#D9F26B]/90 hover:text-[#D9F26B] underline">
            Staff login
          </Link>
        </div>

        {/* Search card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md shadow-2xl mb-8">
          <h2 className="text-lg font-bold mb-4">Find emergency medicine</h2>
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D9F26B]/80 w-5 h-5" />
              <input
                type="text"
                placeholder="Describe the medicine you need urgently (e.g. amoxicillin, insulin)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 pl-10 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D9F26B] focus:border-[#D9F26B] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full py-3.5 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">Searching<span className="animate-pulse">.</span></span>
              ) : (
                <>
                  <Search size={18} /> Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-[#D9F26B]/80 text-sm animate-pulse">
            Searching pharmacies near you…
          </div>
        )}

        {!loading && results && results.results.length === 0 && !error && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
            <p className="text-[#D9F26B]/80 text-sm">No results found for “{query}”.</p>
            <p className="text-xs text-white/50 mt-2">Try a different medicine name.</p>
          </div>
        )}

        {!loading && results && results.results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-[#D9F26B]/80 uppercase tracking-wider font-semibold">
              {results.results.length} result{results.results.length === 1 ? '' : 's'} found
            </p>
            {results.results.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#D9F26B]/10 flex items-center justify-center text-[#D9F26B]">
                  <Truck size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-base font-bold text-white">{r.medicine}</h3>
                    <span className={`text-xs font-semibold border px-1.5 py-0.5 rounded ${urgencyColor(r.urgency)}`}>
                      {r.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mb-2 flex items-center gap-1">
                    <MapPin size={14} className="text-[#D9F26B] shrink-0" />
                    {r.pharmacy}
                  </p>
                  <p className="text-xs text-white/60 mb-3 flex items-center gap-1">
                    <MapPin size={14} className="text-[#D9F26B] shrink-0" />
                    {r.address}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <DollarSign size={14} className="text-[#D9F26B] shrink-0" />
                      <span className="text-white/80">Price</span>
                      <span className="ml-auto text-white font-medium">${r.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-white/80">Stock</span>
                      <span className="ml-auto text-white font-medium">{r.stock}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-white/80">Distance</span>
                      <span className="ml-auto text-white font-medium">{r.distance}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone size={14} className="text-[#D9F26B] shrink-0" />
                      <span className="text-white/80">Reserve now</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setReserveMedicine(r); setReserveOpen(true); }}
                    className="w-full py-2 rounded-lg border border-[#D9F26B]/40 bg-[#D9F26B]/5 text-[#D9F26B] text-xs font-semibold hover:bg-[#D9F26B]/10 transition"
                  >
                    Reserve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {results && results.disclaimer && (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex gap-2 mb-2">
              <ShieldAlert size={16} className="text-[#D9F26B]/80 shrink-0" />
              <span className="text-xs font-semibold text-[#D9F26B]/90">Important disclaimer</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              {results.disclaimer}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Reserve modal */}
      {success && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center max-w-md mx-4 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-[#D9F26B] text-[#0F3D2E] flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Reservation confirmed</h3>
            <p className="text-[#D9F26B]/90 text-sm mb-5">
              Your order for “{success}” has been placed. The pharmacy will contact you shortly.
            </p>
            <button
              onClick={() => setSuccess(null)}
              className="w-full py-3 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <ModalFind
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        title={`Reserve ${reserveMedicine?.medicine}`}
        onSubmit={handleReserve}
        submitting={submitting}
        name={reserveName}
        onNameChange={(e) => setReserveName(e.target.value)}
        medicine={reserveMedicine}
      />
    </div>
  );
}

function ModalFind({ open, onClose, title, onSubmit, submitting, name, onNameChange, medicine }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white/10 border border-white/20 rounded-2xl p-5 max-w-md mx-4 backdrop-blur-md text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-[#D9F26B]/70 hover:text-white">✕</button>
        </div>
        <p className="text-[#D9F26B]/80 text-sm mb-4">
          Enter your name to reserve “{medicine.medicine}” from {medicine.pharmacy}.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={onNameChange}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D9F26B] text-sm"
            required
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold hover:bg-[#d4ec5f] transition disabled:opacity-60"
          >
            {submitting ? 'Reserving…' : 'Confirm Reservation'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CheckCircle({ size = 20 }) {
  return (
    <svg className="w-5 h-5" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
