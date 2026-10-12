import { AlertTriangle, CheckCircle2, PlugZap } from 'lucide-react';
import { APPLIANCE_LABELS } from '../data/rooms';
import type { Room } from '../data/rooms';
import { co2Kg, costRs } from '../lib/calculations';
import { useEnergy } from '../lib/store';
import type { RoomStatus } from '../lib/store';
import { StatusBadge } from './common/StatusBadge';

const explain: Record<RoomStatus, string> = {
  wasting: 'Empty, but appliances are still ON — this is pure waste.',
  occupied: 'Room is in use — this power draw is normal.',
  efficient: 'Empty and switched off — nothing being wasted.',
};

export default function RoomCard({ room }: { room: Room }) {
  const { live, roomStatus, toggleOccupied } = useEnergy();
  const s = live[room.id];
  const status = roomStatus(room.id);
  if (!s) return null;
  const loadPct = Math.min(100, Math.round((s.power_kW / 3.5) * 100));

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md ${
        status === 'wasting' ? 'border-rose-300 waste-pulse' : 'border-slate-200/90 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-mono text-base font-extrabold text-slate-900">{room.name}</span>
          <span className="ml-2 text-[11px] uppercase tracking-wide text-slate-400">
            {room.type} · {room.capacity} seats
          </span>
        </div>
        {status === 'wasting' ? (
          <StatusBadge tone="rose">Wasting</StatusBadge>
        ) : status === 'occupied' ? (
          <StatusBadge tone="emerald">In use</StatusBadge>
        ) : (
          <StatusBadge tone="slate">Empty · OK</StatusBadge>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-black tabular-nums text-slate-900">
          {s.power_kW.toFixed(2)}
        </span>
        <span className="text-xs text-slate-500">kW right now</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">
          {s.occupied ? (
            <PlugZap className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
          )}
          {s.occupied ? 'Occupied' : 'Empty'}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${status === 'wasting' ? 'bg-rose-500' : status === 'occupied' ? 'bg-emerald-500' : 'bg-slate-300'}`}
          style={{ width: `${loadPct}%` }}
        />
      </div>

      <p className={`mt-2 flex items-start gap-1.5 text-xs leading-relaxed ${status === 'wasting' ? 'font-semibold text-rose-700' : 'text-slate-500'}`}>
        {status === 'wasting' && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        {explain[status]}
      </p>
      <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
        {s.todayKWh.toFixed(2)} kWh today · ₹{costRs(s.todayKWh).toFixed(2)} ·{' '}
        {co2Kg(s.todayKWh).toFixed(2)} kg CO₂
      </div>
      <div className="mt-0.5 text-[11px] text-slate-400">
        On: {s.appliancesOn.length > 0 ? s.appliancesOn.map((k) => APPLIANCE_LABELS[k] ?? k).join(', ') : 'nothing'}
      </div>

      <button
        type="button"
        onClick={() => toggleOccupied(room.id)}
        className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
          s.occupied
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {s.occupied ? 'Set room to Empty' : 'Set room to Occupied'}
      </button>
    </div>
  );
}
