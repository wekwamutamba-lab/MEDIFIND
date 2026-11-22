import { useState } from 'react';
import { ShieldCheck, Cpu, Zap, Palette, Lock, Bell } from 'lucide-react';

export default function Settings() {
  const [tab, setTab] = useState('general');

  const TABS = [
    { key: 'general', label: 'General', icon: ShieldCheck },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="text-gray-500 text-sm">Manage your MediFind preferences.</div>
      </div>

      <div className="flex gap-1 border border-gray-200 rounded-xl bg-white shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-sm font-medium transition rounded-l-xl ${
              tab === t.key
                ? 'bg-sidebar text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <t.icon size={16} className={tab === t.key ? 'text-lime' : 'text-current'} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 shadow-sm p-6">
        {tab === 'general' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Store name</p>
                <p className="text-xs text-gray-500">Display name shown on receipts</p>
              </div>
              <input className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-lime" defaultValue="MediFind Pharmacy" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Store location</p>
                <p className="text-xs text-gray-500">Primary pharmacy address</p>
              </div>
              <input className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-lime" defaultValue="12 Main Street, Downtown" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Time zone</p>
                <p className="text-xs text-gray-500">Used for order timestamps</p>
              </div>
              <select className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-lime">
                <option>UTC</option>
                <option>EST</option>
                <option>PST</option>
              </select>
            </div>
          </div>
        )}
        {tab === 'notifications' && (
          <div className="space-y-4">
            {[['Order confirmations', 'Low stock alerts', 'Expiry reminders', 'Marketing emails']].flat().map((label) => (
              <div key={label} className="flex items-center justify-between">
                <p className="text-gray-700 text-sm">{label}</p>
                <button className="w-10 h-5 rounded-full border border-gray-300 bg-lime relative focus:outline-none">
                  <span className="block w-3 h-3 rounded-full bg-sidebar absolute left-1 top-1"></span>
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === 'appearance' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Cpu size={20} className="text-sidebar" />
              <div>
                <p className="font-semibold text-gray-900">Theme</p>
                <p className="text-xs text-gray-500">Dark green sidebar, lime accents</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Zap size={20} className="text-sidebar" />
              <div>
                <p className="font-semibold text-gray-900">Font</p>
                <p className="text-xs text-gray-500">Poppins</p>
              </div>
            </div>
          </div>
        )}
        {tab === 'security' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Change password</p>
                <p className="text-xs text-gray-500">Update your account password</p>
              </div>
              <button className="px-4 py-2 rounded-lg text-sm text-sidebar hover:bg-sidebar/10">Change</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Two-factor auth</p>
                <p className="text-xs text-gray-500">Add an extra layer of security</p>
              </div>
              <button className="w-10 h-5 rounded-full border border-gray-300 bg-lime relative focus:outline-none">
                <span className="block w-3 h-3 rounded-full bg-sidebar absolute left-1 top-1"></span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
