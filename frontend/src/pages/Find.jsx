import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function Find() {
  return (
    <div className="min-h-screen bg-[#0F3D2E] text-white">
      <div className="max-w-xl mx-auto px-4 py-8">
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

        <p className="text-white/60 text-sm mb-8">
          The medicine search has been repurposed as a supplier sourcing tool for pharmacists.
          Use the <a href="/restock" className="text-[#D9F26B] underline">Restock</a> page to source stock from suppliers.
        </p>
      </div>
    </div>
  );
}
