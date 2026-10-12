import { useMemo } from 'react';
import { Coins, Leaf, Sprout, Zap } from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import { Panel } from '../components/ui';
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

  const tiles = [
    { label: 'Energy lost', value: `${totals.wastedKwh.toFixed(2)} kWh`, note: `≈ ${Math.round(totals.phones)} phone charges`, icon: Zap, tile: 'bg-blue-50 text-blue-600' },
    { label: 'Money burned', value: `₹${totals.wastedRs.toFixed(2)}`, note: 'at ₹8 per unit', icon: Coins, tile: 'bg-rose-50 text-rose-600' },
    { label: 'CO₂ emitted', value: `${totals.co2Kg.toFixed(2)} kg`, note: 'at 0.82 kg per unit', icon: Sprout, tile: 'bg-amber-50 text-amber-600' },
    { label: 'Trees to offset', value: totals.trees.toFixed(2), note: 'one tree absorbs ~21 kg/year', icon: Leaf, tile: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="page-enter flex flex-col gap-6">
      <Panel
        title="What waste costs the campus"
        subtitle="Every wasted unit is converted into money, carbon and everyday equivalents."
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.label}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${t.tile}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                  {t.value}
                </div>
                <p className="mt-1 text-xs text-slate-400">{t.note}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Efficiency leaderboard"
        subtitle="Rooms ranked by least waste. Score = 100 − wasted kWh × 10. Fix waste to climb the board."
      >
        <Leaderboard />
      </Panel>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6">
        {worst && worst.waste > 0.0005 ? (
          <>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Projection — fix {worst.name}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              If {worst.name} is switched off whenever it is empty, the campus saves{' '}
              <span className="font-black text-emerald-700">₹{costRs(monthlyKwh).toFixed(0)}/month</span>{' '}
              and avoids{' '}
              <span className="font-black text-slate-900">{co2Kg(monthlyKwh).toFixed(1)} kg of CO₂</span>{' '}
              — the work of {treesEquivalent(co2Kg(monthlyKwh)).toFixed(1)} trees, or{' '}
              {Math.round(phonesCharged(monthlyKwh))} phone charges.
            </p>
            <p className="mt-2 font-mono text-[11px] tabular-nums text-slate-400">
              Math: {worst.waste.toFixed(4)} kWh wasted today × 30 days = {monthlyKwh.toFixed(3)} kWh/month.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            No significant waste recorded yet — the savings projection appears after a room wastes energy.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 font-mono text-[11px] leading-relaxed text-slate-400 shadow-xs">
        Formulas: cost = kWh × ₹8.0 · CO₂ = kWh × 0.82 kg · trees = CO₂ ÷ 21 ·
        phones = kWh × 80 · Detection: empty + &gt;0.2 kW for 2 readings (5s each) → alert.
      </div>
    </div>
  );
}
