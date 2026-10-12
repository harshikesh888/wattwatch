import { useMemo } from 'react';
import { Check, Clock3, Zap } from 'lucide-react';
import type { Alert } from '../data/rooms';
import { costRs, fmtDuration } from '../lib/calculations';
import { useEnergy } from '../lib/store';
import { useToast } from '../lib/toast';
import { StatusBadge } from './common/StatusBadge';

type Urgency = 'Critical' | 'High' | 'Moderate';

function urgencyFor(alert: Alert, ageMs: number): Urgency {
  const ageMinutes = ageMs / 60_000;
  if (alert.power_kW >= 2.5 || alert.wasted_kWh >= 0.1 || ageMinutes >= 30) return 'Critical';
  if (alert.power_kW >= 1.25 || alert.wasted_kWh >= 0.03 || ageMinutes >= 10) return 'High';
  return 'Moderate';
}

function priorityScore(alert: Alert, ageMs: number): number {
  const ageMinutes = Math.min(ageMs / 60_000, 120);
  return alert.power_kW * 100 + ageMinutes * 1.5 + alert.wasted_kWh * 500;
}

const urgencyTone = {
  Critical: 'rose',
  High: 'amber',
  Moderate: 'sky',
} as const;

export default function UrgencyLeaderboard({
  emptyText = 'Nothing urgent right now — all empty rooms are switched off.',
}: {
  emptyText?: string;
}) {
  const { activeAlerts, now, resolveAlert, roomName } = useEnergy();
  const { push } = useToast();

  const rankedAlerts = useMemo(
    () =>
      activeAlerts
        .map((alert) => {
          const ageMs = Math.max(0, now - alert.startTime);
          return {
            alert,
            ageMs,
            urgency: urgencyFor(alert, ageMs),
            score: priorityScore(alert, ageMs),
          };
        })
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.alert.power_kW - a.alert.power_kW ||
            a.alert.startTime - b.alert.startTime,
        ),
    [activeAlerts, now],
  );

  if (rankedAlerts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-6 text-center">
        <Check className="mx-auto mb-2 h-9 w-9 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-800">All clear!</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rankedAlerts.map(({ alert, ageMs, urgency }, index) => (
        <article
          key={alert.id}
          className={`rounded-xl border p-4 transition-colors ${
            urgency === 'Critical'
              ? 'border-rose-300 bg-rose-50/50'
              : urgency === 'High'
                ? 'border-amber-200 bg-amber-50/40'
                : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black ${
                    index === 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                  aria-label={`Priority ${index + 1}`}
                >
                  {index + 1}
                </span>
                <span className="font-bold text-slate-900">{roomName(alert.roomId)}</span>
                <StatusBadge tone="rose">Active waste</StatusBadge>
                <StatusBadge tone={urgencyTone[urgency]}>{urgency}</StatusBadge>
              </div>
              <p className="ml-9 text-xs text-slate-600">
                Empty room with equipment still running
              </p>
              <div className="ml-9 mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-600" />
                  {alert.power_kW.toFixed(2)} kW now
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                  Active for {fmtDuration(ageMs)}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
                  {alert.wasted_kWh.toFixed(3)} kWh · ₹{costRs(alert.wasted_kWh).toFixed(2)} wasted
                </span>
              </div>
              <p className="ml-9 mt-1 text-[11px] text-slate-500">
                Current burn rate: ₹{costRs(alert.power_kW).toFixed(2)} per hour
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                resolveAlert(alert.id);
                push('success', `${roomName(alert.roomId)} switched off — alert fixed.`);
              }}
              title={`Switch off everything in ${roomName(alert.roomId)} and close the alert`}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:ml-4"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              Mark Fixed
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
