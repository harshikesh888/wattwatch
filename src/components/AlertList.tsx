import { AlertTriangle, Check, CheckCircle2 } from 'lucide-react';
import type { Alert } from '../data/rooms';
import { co2Kg, costRs, fmtDuration } from '../lib/calculations';
import { useEnergy } from '../lib/store';
import { useToast } from '../lib/toast';
import { StatusBadge } from './common/StatusBadge';

interface AlertListProps {
  alerts: Alert[];
  compact?: boolean;
  emptyText?: string;
}

export default function AlertList({ alerts, compact, emptyText }: AlertListProps) {
  const { roomName, resolveAlert, now } = useEnergy();
  const { push } = useToast();
  const shown = compact ? alerts.slice(0, 5) : alerts;

  if (shown.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-800">All clear!</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
          {emptyText ?? 'No active energy waste detected. Every empty room is switched off.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {shown.map((a) => {
        const end = a.status === 'active' ? now : (a.endTime ?? now);
        const active = a.status === 'active';
        return (
          <div
            key={a.id}
            className={`flex flex-col justify-between rounded-xl border bg-slate-50/40 p-4 transition-all hover:shadow-xs ${
              active ? 'border-rose-300 waste-pulse' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {active && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                    <span className="text-sm font-bold text-slate-900">{roomName(a.roomId)}</span>
                    <StatusBadge tone={active ? 'rose' : 'emerald'}>{active ? 'Wasting' : 'Fixed'}</StatusBadge>
                  </div>
                  <span className="text-[11px] tabular-nums text-slate-400">
                    wasting for {fmtDuration(end - a.startTime)} · drawing {a.power_kW.toFixed(2)} kW
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-black tabular-nums text-rose-600">
                    {a.wasted_kWh.toFixed(3)} kWh
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-700">
                    ₹{costRs(a.wasted_kWh).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-slate-600">
                Empty room with equipment left running · {co2Kg(a.wasted_kWh).toFixed(3)} kg CO₂ so far.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
              <span className="font-mono text-[11px] text-slate-400">{a.id}</span>
              {active && (
                <button
                  type="button"
                  onClick={() => {
                    resolveAlert(a.id);
                    push('success', `${roomName(a.roomId)} switched off — alert fixed.`);
                  }}
                  title="Switch off everything in this room and close the alert"
                  className="inline-flex items-center gap-1 bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700"
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                  <span>Mark Fixed</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
