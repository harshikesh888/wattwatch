import AlertList from '../components/AlertList';
import { AlertIcon, CheckIcon, LeafIcon } from '../components/icons';
import { Hint, Panel } from '../components/ui';
import { co2Kg, costRs } from '../lib/calculations';
import { useEnergy } from '../lib/store';

export default function Alerts() {
  const { activeAlerts, historyAlerts, totals } = useEnergy();

  return (
    <div className="page-enter flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-red-300">
            <AlertIcon className="h-4 w-4" />
            <span className="font-mono text-2xl font-black tabular-nums">{activeAlerts.length}</span>
          </div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Wasting now
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-300">
            <CheckIcon className="h-4 w-4" />
            <span className="font-mono text-2xl font-black tabular-nums text-slate-100">{historyAlerts.length}</span>
          </div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Fixed today
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-300">
            <LeafIcon className="h-4 w-4" />
            <span className="font-mono text-2xl font-black tabular-nums text-slate-100">
              {totals.wastedKwh.toFixed(2)}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            kWh wasted today
          </div>
        </div>
      </div>

      <Panel
        title={`Wasting now — needs action (${activeAlerts.length})`}
        subtitle="Each card is an empty room with appliances left on. The kWh counter grows every 5 seconds."
      >
        <Hint>
          Press <span className="font-bold text-red-200">“Switch off + Resolve”</span> to cut power to that
          room (drops to 0.02 kW standby) and move the alert to history.
        </Hint>
        <div className="mt-3">
          <AlertList alerts={activeAlerts} emptyText="Nothing wasting right now — all empty rooms are off." />
        </div>
      </Panel>

      <Panel
        title={`Fixed today (${historyAlerts.length})`}
        subtitle="Resolved alerts and the energy each one burned before it was fixed."
      >
        <AlertList alerts={historyAlerts} emptyText="No fixed alerts yet. Resolve one above to see it land here." />
      </Panel>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 font-mono text-xs tabular-nums leading-relaxed text-slate-400">
        Total impact of all alerts: {totals.wastedKwh.toFixed(3)} kWh · &#8377;
        {costRs(totals.wastedKwh).toFixed(2)} · {co2Kg(totals.wastedKwh).toFixed(3)} kg CO&#8322;
      </div>
    </div>
  );
}
