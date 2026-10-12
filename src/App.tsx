import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { AuthProvider } from './lib/auth';
import { ReportsProvider } from './lib/reports';
import { EnergyProvider, useEnergy } from './lib/store';
import { ToastProvider, useToast } from './lib/toast';
import Alerts from './pages/Alerts';
import Dashboard from './pages/Dashboard';
import Impact from './pages/Impact';
import Login from './pages/Login';
import Reports from './pages/Reports';
import Rooms from './pages/Rooms';
import Signup from './pages/Signup';

function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const { resetDay } = useEnergy();
  const { push } = useToast();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 antialiased selection:bg-emerald-500 selection:text-white md:flex-row">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onResetClick={() => {
          setSidebarOpen(false);
          setResetModalOpen(true);
        }}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
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

        <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 bg-white/60 px-6 py-4 text-center text-xs text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">WattWatch</span>
            <span className="text-slate-300">•</span>
            <span>Empty-room energy waste detection</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Readings every 5s · saved in your browser · ₹8/kWh · 0.82 kg CO₂/kWh
          </div>
        </footer>
      </div>

      <ConfirmationModal
        isOpen={resetModalOpen}
        title="Reset the simulator day?"
        message="This restarts all rooms, clears alerts and energy totals, and restores the default occupancy. Your login and problem reports are kept."
        confirmLabel="Reset Day"
        isDestructive
        onConfirm={() => {
          resetDay();
          setResetModalOpen(false);
          push('success', 'Fresh day started — simulator reset.');
        }}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <EnergyProvider>
        <AuthProvider>
          <ReportsProvider>
            <ToastProvider>
              <Shell />
            </ToastProvider>
          </ReportsProvider>
        </AuthProvider>
      </EnergyProvider>
    </BrowserRouter>
  );
}
