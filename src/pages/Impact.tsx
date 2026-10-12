import { useMemo } from 'react';
import Leaderboard from '../components/Leaderboard';
import { CashIcon, LeafIcon, BoltIcon, PowerIcon } from '../components/icons';
import { Hint, Panel } from '../components/ui';
import { co2Kg, costRs, phonesCharged, treesEquivalent } from '../lib/calculations';
import { useEnergy } from '../lib/store';

export default function Impact() {
  const { rooms, wasteByRoom, roomName, totals } = useEnergy();

  const worst = useMemo(() => {
    let id: string | null = null;
    let waste = 0;
    for (const r of rooms) {
      const w = wasteByRoom[r.id] ?? 0;
      if (w > waste) {
        waste = w;
        id = r.id;
      }
    }
    return id ? { id, name: roomName(id), waste } : null;
  }, [rooms, wasteByRoom, roomName]);

  const monthlyKwh = (worst?.waste ?? 0) * 30;

  return (
    <div className="page-enter flex flex-col gap-4">
      <Panel
        title="What waste costs the campus"
        subtitle="Every wasted unit is converted into money, carbon and everyday equivalents."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <BoltIcon className="h-3.5 w-3.5 text-cyan-300" /> Energy lost
            </div>
            <div className="mt-1 font-mono text-2xl font-black tabular-nums text-slate-50">
              {totals.wastedKwh.toFixed(2)} <span className="text-sm font-bold text-slate-400">kWh</span>
            </div>
            <div className="text-xs text-slate-500">enough to charge {Math.round(totals.phones)} phones</div>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <CashIcon className="h-3.5 w-3.5 text-red-300" /> Money burned
            </div>
            <div className="mt-1 font-mono text-2xl font-black tabular-nums text-red-300">
              &#8377;{totals.wastedRs.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">at &#8377;8 per unit</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <PowerIcon className="h-3.5 w-3.5 text-amber-300" /> CO&#8322; emitted
            </div>
            <div className="mt-1 font-mono text-2xl font-black tabular-nums text-amber-300">
              {totals.co2Kg.toFixed(2)} <span className="text-sm font-bold text-slate-400">kg</span>
            </div>
            <div className="text-xs text-slate-500">at 0.82 kg per unit</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <LeafIcon className="h-3.5 w-3.5 text-emerald-300" /> Trees to offset
            </div>
            <div className="mt-1 font-mono text-2xl font-black tabular-nums text-emerald-300">
              {totals.trees.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">one tree absorbs ~21 kg/year</div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Efficiency leaderboard"
        subtitle="Rooms ranked by least waste. Score = 100 − wasted kWh × 10. Fix waste to climb the board."
      >
        <Leaderboard />
      </Panel>

      <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-slate-900/70 p-5">
        {worst && worst.waste > 0.0005 ? (
          <>
            <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-200">
              Projection — fix {worst.name}
            </h2>
            <p className="mt-2 max-w-3xl text-lg leading-relaxed text-slate-100">
              If {worst.name} is switched off whenever it is empty, the campus saves{' '}
              <span className="font-mono font-black text-emerald-300">
                &#8377;{costRs(monthlyKwh).toFixed(0)}/month
              </span>{' '}
              and avoids{' '}
              <span className="font-mono font-black text-amber-300">
                {co2Kg(monthlyKwh).toFixed(1)} kg of CO&#8322;
              </span>{' '}
              — the work of {treesEquivalent(co2Kg(monthlyKwh)).toFixed(1)} trees, or{' '}
              {Math.round(phonesCharged(monthlyKwh))} phone charges.
            </p>
            <p className="mt-2 font-mono text-[11px] tabular-nums text-slate-500">
              Math: {worst.waste.toFixed(4)} kWh wasted today × 30 days = {monthlyKwh.toFixed(3)} kWh/month.
            </p>
          </>
        ) : (
          <Hint>No significant waste recorded yet — the savings projection appears after a room wastes energy.</Hint>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 font-mono text-[11px] leading-relaxed text-slate-500">
        Formulas: cost = kWh × &#8377;8.0 · CO&#8322; = kWh × 0.82 kg · trees = CO&#8322; ÷ 21 ·
        phones = kWh × 80 · Detection: empty + &gt;0.2 kW for 2 readings (5s each) → alert.
      </div>
    </div>
  );
}
