import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { BoltIcon, ChartIcon, RoomIcon, AlertIcon, LeafIcon, WrenchIcon, LogoutIcon } from './components/icons';
import { fmtClock } from './lib/calculations';
import { AuthProvider, useAuth } from './lib/auth';
import { ReportsProvider, useReports } from './lib/reports';
import { EnergyProvider, useEnergy } from './lib/store';
import Alerts from './pages/Alerts';
import Dashboard from './pages/Dashboard';
import Impact from './pages/Impact';
import Login from './pages/Login';
import Reports from './pages/Reports';
import Rooms from './pages/Rooms';
import Signup from './pages/Signup';

const tabs = [
  { to: '/', label: 'Dashboard', icon: <ChartIcon className="h-4 w-4" />, hint: 'Live campus status' },
  { to: '/rooms', label: 'Rooms', icon: <RoomIcon className="h-4 w-4" />, hint: 'Control every room' },
  { to: '/alerts', label: 'Alerts', icon: <AlertIcon className="h-4 w-4" />, hint: 'Waste needing action' },
  { to: '/impact', label: 'Impact', icon: <LeafIcon className="h-4 w-4" />, hint: 'Savings and leaderboard' },
  { to: '/reports', label: 'Reports', icon: <WrenchIcon className="h-4 w-4" />, hint: 'Raise room problems' },
];

function Header() {
  const { now, totals, activeAlerts, resetDay } = useEnergy();
  const { user, logout } = useAuth();
  const { openCount } = useReports();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-950/50">
            <BoltIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 font-mono text-lg font-black leading-none text-slate-50">
              WattWatch
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot" /> LIVE
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              Empty-room energy waste detector · {fmtClock(now)} ·{' '}
              <span className="font-mono font-bold tabular-nums text-cyan-300">
                {totals.liveKw.toFixed(2)} kW
              </span>{' '}
              campus
              {activeAlerts.length > 0 && (
                <span className="ml-1 font-bold text-red-400">· {activeAlerts.length} wasting</span>
              )}
            </div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <nav className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === '/'}
                title={t.hint}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-slate-700 text-slate-50 shadow' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`
                }
              >
                {t.icon}
                {t.label}
                {t.to === '/alerts' && activeAlerts.length > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 font-mono text-[10px] font-black text-white">
                    {activeAlerts.length}
                  </span>
                )}
                {t.to === '/reports' && openCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-950">
                    {openCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => resetDay()}
            title="Restart the simulator with a fresh day"
            className="rounded-xl border border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Reset day
          </button>
          {user ? (
            <span className="flex items-center gap-2">
              <span
                title={`Logged in as ${user.name}`}
                className="hidden items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2 text-xs font-bold text-cyan-200 sm:flex"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/30 font-mono text-[10px] font-black">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                {user.name}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                title="Log out"
                className="flex items-center gap-1 rounded-xl border border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <LogoutIcon className="h-3.5 w-3.5" />
                Logout
              </button>
            </span>
          ) : (
            <NavLink
              to="/login"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-950 hover:bg-emerald-400"
            >
              Login
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

function Shell() {
  return (
    <div className="min-h-screen text-slate-200">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-6 font-mono text-[11px] leading-relaxed text-slate-600">
        WattWatch · hackathon MVP · readings every 5s · saved in your browser · cost &#8377;8/kWh ·
        CO&#8322; 0.82 kg/kWh · an alert means an empty room is using power — go switch it off.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <EnergyProvider>
        <AuthProvider>
          <ReportsProvider>
            <Shell />
          </ReportsProvider>
        </AuthProvider>
      </EnergyProvider>
    </BrowserRouter>
  );
}
