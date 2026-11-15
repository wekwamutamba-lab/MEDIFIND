import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const DEMO_KEY = 'mf_demo';

export default function Login() {
  const navigate = useNavigate();

  const continueAsDemo = () => {
    localStorage.setItem(DEMO_KEY, 'true');
    navigate('/overview', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0F3D2E] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#D9F26B] text-[#0F3D2E] flex items-center justify-center font-bold text-lg">
            MF
          </div>
          <span className="text-2xl font-bold tracking-tight">
            Medi<span className="text-[#D9F26B]">Find</span>
          </span>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-md shadow-2xl">
          <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
          <p className="text-white/70 text-sm mb-6">
            Emergency-first medicine reservation and pharmacy stock management.
          </p>

          <button
            type="button"
            onClick={continueAsDemo}
            className="w-full py-4 px-4 rounded-xl bg-[#D9F26B] text-[#0F3D2E] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#d4ec5f] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ShieldCheck size={18} />
            Continue as Demo Pharmacist
          </button>

          <p className="mt-5 text-xs text-white/60 text-center">
            Demo mode — no credentials required. Data resets on refresh.
          </p>
        </div>

        <p className="mt-6 text-xs text-white/50 text-center">
          MediFind &bull; Emergency medicine reservation
        </p>
      </div>
    </div>
  );
}
