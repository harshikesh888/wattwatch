import { AlertTriangle, Building2, CheckCircle2 } from 'lucide-react';
import AlertList from '../components/AlertList';
import { Hint, Panel } from '../components/ui';
import { co2Kg, costRs } from '../lib/calculations';
import { useEnergy } from '../lib/store';

export default function Alerts() {
  const { activeAlerts, historyAlerts, totals } = useEnergy();

  const stats = [
    { label: 'Wasting now', value: String(activeAlerts.length), icon: AlertTriangle, tile: 'bg-rose-50 text-rose-600' },
    { label: 'Fixed today', value: String(historyAlerts.length), icon: CheckCircle2, tile: 'bg-emerald-50 text-emerald-600' },
    { label: 'kWh wasted today', value: totals.wastedKwh.toFixed(2), icon: Building2, tile: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="page-enter flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-xs sm:p-5">
              <div className="flex items-center justify-center gap-2">
                <span className={`hidden h-8 w-8 items-center justify-center rounded-xl sm:flex ${s.tile}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-2xl font-black tabular-nums text-slate-900">{s.value}</span>
              </div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      <Panel
        title={`Wasting now — needs action (${activeAlerts.length})`}
        subtitle="Each card is an empty room with appliances left on. The kWh counter grows every 5 seconds."
      >
        <Hint>
          Press <span className="font-bold text-emerald-700">“Mark Fixed”</span> to cut power to that
          room (drops to 0.02 kW standby) and move the alert to history.
        </Hint>
        <div className="mt-4">
          <AlertList alerts={activeAlerts} emptyText="Nothing wasting right now — all empty rooms are off." />
        </div>
      </Panel>

      <Panel
        title={`Fixed today (${historyAlerts.length})`}
        subtitle="Resolved alerts and the energy each one burned before it was fixed."
      >
        <AlertList alerts={historyAlerts} emptyText="No fixed alerts yet. Fix one above to see it land here." />
      </Panel>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 font-mono text-xs tabular-nums leading-relaxed text-slate-500 shadow-xs">
        Total impact of all alerts: {totals.wastedKwh.toFixed(3)} kWh · ₹
        {costRs(totals.wastedKwh).toFixed(2)} · {co2Kg(totals.wastedKwh).toFixed(3)} kg CO₂
      </div>
    </div>
  );
}
