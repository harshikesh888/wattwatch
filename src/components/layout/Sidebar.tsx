import {
  AlertTriangle,
  Building2,
  LayoutDashboard,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Wrench,
  Zap,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useReports } from '../../lib/reports';
import { useEnergy } from '../../lib/store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onResetClick: () => void;
}

export function Sidebar({ isOpen, onClose, onResetClick }: SidebarProps) {
  const { activeAlerts } = useEnergy();
  const { openCount } = useReports();
  const { user, logout, roomNameOf } = useAuth();

  const navItems = [
    { to: '/', label: 'Waste Dashboard', hint: 'Live campus status', icon: LayoutDashboard, end: true },
    { to: '/alerts', label: 'All Alerts', hint: 'Waste needing action', icon: AlertTriangle, badge: activeAlerts.length, badgeTone: 'rose' as const },
    { to: '/rooms', label: 'Campus Rooms', hint: 'Control every room', icon: Building2 },
    { to: '/impact', label: 'Impact', hint: 'Savings and leaderboard', icon: Leaf },
    { to: '/reports', label: 'Reports', hint: 'Raise room problems', icon: Wrench, badge: openCount, badgeTone: 'amber' as const },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-200 ease-in-out md:sticky ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-800/80 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-slate-950 shadow-md shadow-emerald-950/40">
            <Zap className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-white">WattWatch</span>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                LIVE
              </span>
            </div>
            <p className="text-[11px] leading-tight text-slate-400">Campus Energy Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item && item.end}
                title={item.hint}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shadow-xs'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </span>
                    {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                          item.badgeTone === 'rose'
                            ? 'border-rose-500/30 bg-rose-500/20 text-rose-300'
                            : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Account
          </div>
          {user ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-sm font-black text-emerald-300">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-100">{user.name}</div>
                  <div className="text-[11px] text-slate-400">Room {roomNameOf(user)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="mt-2.5 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              onClick={onClose}
              className="block rounded-xl bg-emerald-600 px-3.5 py-2.5 text-center text-sm font-bold text-white hover:bg-emerald-700"
            >
              Log in / Sign up
            </NavLink>
          )}
        </nav>

        <div className="space-y-3 border-t border-slate-800/80 bg-slate-950/40 p-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Rule-Based Detection</span>
            </div>
            <p className="text-[11px] leading-snug text-slate-400">
              Empty room over 0.2 kW for 2 readings raises an alert. No black box.
            </p>
          </div>

          <button
            type="button"
            onClick={onResetClick}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Day</span>
          </button>
        </div>
      </aside>
    </>
  );
}
