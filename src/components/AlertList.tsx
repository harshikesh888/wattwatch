import type { Alert } from '../data/rooms';
import { co2Kg, costRs, fmtDuration } from '../lib/calculations';
import { useEnergy } from '../lib/store';
import { AlertIcon, CheckIcon } from './icons';

interface AlertListProps {
  alerts: Alert[];
  compact?: boolean;
  emptyText?: string;
}

export default function AlertList({ alerts, compact, emptyText }: AlertListProps) {
  const { roomName, resolveAlert, now } = useEnergy();
  const shown = compact ? alerts.slice(0, 5) : alerts;

  if (shown.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 text-sm text-emerald-200">
        <CheckIcon className="h-5 w-5 shrink-0" />
        {emptyText ?? 'No active waste. Every empty room is switched off.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {shown.map((a) => {
        const end = a.status === 'active' ? now : (a.endTime ?? now);
        const active = a.status === 'active';
        return (
          <div
            key={a.id}
            className={`rounded-xl border p-3.5 ${
              active
                ? 'border-red-500/70 bg-red-950/30 waste-pulse'
                : 'border-slate-800 bg-slate-950/50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  active ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <AlertIcon className="h-4 w-4" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-mono text-sm font-black text-slate-50">{roomName(a.roomId)}</span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">
                    wasting for {fmtDuration(end - a.startTime)} · drawing {a.power_kW.toFixed(2)} kW
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-300">
                  Burned so far: {a.wasted_kWh.toFixed(4)} kWh · &#8377;{costRs(a.wasted_kWh).toFixed(2)} ·{' '}
                  {co2Kg(a.wasted_kWh).toFixed(3)} kg CO&#8322;
                </div>
              </div>
              {active ? (
                <button
                  type="button"
                  onClick={() => resolveAlert(a.id)}
                  title="Switch off everything in this room and close the alert"
                  className="ml-auto rounded-xl bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/50 hover:bg-red-400"
                >
                  Switch off + Resolve
                </button>
              ) : (
                <span className="ml-auto rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  FIXED
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
