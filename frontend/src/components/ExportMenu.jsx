import { useEffect, useRef, useState } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import { EXPORT_FORMATS, exportReport } from '../lib/exportFile';

// "Export" button with a menu: CSV, Excel or PDF.
// buildReport() is called when a format is picked; it fetches the full list
// (every page, with the filters on screen) and returns the report to save.
export default function ExportMenu({ buildReport, label = 'Export' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const run = async (format) => {
    setOpen(false);
    setBusy(true);
    setError('');
    try {
      await exportReport(await buildReport(), format);
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={box} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {busy ? 'Preparing…' : label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="menuitem"
              onClick={() => run(f.key)}
              className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="absolute right-0 mt-1 w-64 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
