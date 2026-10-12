import { Menu, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { fmtClock } from '../../lib/calculations';
import { useEnergy } from '../../lib/store';
import { StatusBadge } from '../common/StatusBadge';

function pageInfo(path: string): { title: string; subtitle: string } {
  switch (path) {
    case '/rooms':
      return { title: 'Campus Rooms', subtitle: '8 monitored classrooms, labs and halls. Toggle occupancy and appliances to simulate.' };
    case '/alerts':
      return { title: 'Waste Alerts', subtitle: 'Empty rooms burning power. Inspect a room and mark it fixed.' };
    case '/impact':
      return { title: 'Savings & Impact', subtitle: 'Money, carbon and the efficiency leaderboard.' };
    case '/reports':
      return { title: 'Room Problem Reports', subtitle: 'Raise a fault in your room and track it to fixed.' };
    case '/login':
      return { title: 'Log in', subtitle: 'Access your campus energy account.' };
    case '/signup':
      return { title: 'Create account', subtitle: 'Join with your room to raise reports.' };
    default:
      return { title: 'Energy Waste Overview', subtitle: 'Detecting empty rooms where lights, AC or projectors were left running.' };
  }
}

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { pathname } = useLocation();
  const { totals, now, activeAlerts } = useEnergy();
  const { title, subtitle } = pageInfo(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md transition-all sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h1>
              <div className="hidden sm:inline-block">
                <StatusBadge tone={activeAlerts.length > 0 ? 'rose' : 'emerald'}>
                  {activeAlerts.length > 0 ? `${activeAlerts.length} wasting` : 'All clean'}
                </StatusBadge>
              </div>
            </div>
            <p className="hidden text-xs text-slate-500 md:block">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 sm:flex">
            <span className="text-slate-400">Rate:</span>
            <span className="font-bold text-slate-900">₹8/unit</span>
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
            <Zap className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-bold tabular-nums text-slate-900">{totals.liveKw.toFixed(2)} kW</span>
            <span className="hidden tabular-nums text-slate-400 sm:inline">{fmtClock(now)}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 live-dot" />
          </div>
        </div>
      </div>
    </header>
  );
}
