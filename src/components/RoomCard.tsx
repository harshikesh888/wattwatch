import { APPLIANCE_LABELS } from '../data/rooms';
import type { Room } from '../data/rooms';
import { co2Kg, costRs } from '../lib/calculations';
import { useEnergy } from '../lib/store';
import type { RoomStatus } from '../lib/store';
import { AlertIcon, CheckIcon, PowerIcon } from './icons';

const cardStyle: Record<RoomStatus, string> = {
  wasting: 'border-red-500/70 bg-gradient-to-b from-red-950/40 to-slate-900/70 waste-pulse',
  occupied: 'border-emerald-500/30 bg-slate-900/70',
  efficient: 'border-slate-800 bg-slate-900/70',
};

const pillStyle: Record<RoomStatus, string> = {
  wasting: 'bg-red-500/20 text-red-200 border-red-500/50',
  occupied: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40',
  efficient: 'bg-slate-700/40 text-slate-300 border-slate-600/50',
};

const explain: Record<RoomStatus, string> = {
  wasting: 'Empty, but appliances are still ON — this is pure waste.',
  occupied: 'Room is in use — this power draw is normal.',
  efficient: 'Empty and switched off — nothing being wasted.',
};

const pillLabel: Record<RoomStatus, string> = {
  wasting: 'Wasting power',
  occupied: 'In use',
  efficient: 'Empty · Efficient',
};

function StatusGlyph({ status }: { status: RoomStatus }) {
  if (status === 'wasting') return <AlertIcon className="h-3.5 w-3.5" />;
  if (status === 'occupied') return <PowerIcon className="h-3.5 w-3.5" />;
  return <CheckIcon className="h-3.5 w-3.5" />;
}

export default function RoomCard({ room }: { room: Room }) {
  const { live, roomStatus, toggleOccupied } = useEnergy();
  const s = live[room.id];
  const status = roomStatus(room.id);
  if (!s) return null;
  const loadPct = Math.min(100, Math.round((s.power_kW / 3.5) * 100));

  return (
    <div className={`rounded-2xl border p-4 shadow-xl shadow-black/30 transition-colors ${cardStyle[status]}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-mono text-lg font-black text-slate-50">{room.name}</span>
          <span className="ml-2 text-[11px] uppercase tracking-wider text-slate-500">
            {room.type} · {room.capacity} seats
          </span>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${pillStyle[status]}`}
        >
          <StatusGlyph status={status} />
          {pillLabel[status]}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-[1.65rem] font-black tabular-nums leading-none text-slate-50">
          {s.power_kW.toFixed(2)}
        </span>
        <span className="text-xs text-slate-400">kW right now</span>
        <span className={`ml-auto flex items-center gap-1 text-[11px] ${s.occupied ? 'text-emerald-300' : 'text-slate-400'}`}>
          <span className={`h-2 w-2 rounded-full ${s.occupied ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {s.occupied ? 'Occupied' : 'Empty'}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${status === 'wasting' ? 'bg-red-400' : status === 'occupied' ? 'bg-emerald-400' : 'bg-slate-500'}`}
          style={{ width: `${loadPct}%` }}
        />
      </div>

      <p className={`mt-2 text-xs leading-relaxed ${status === 'wasting' ? 'font-semibold text-red-200' : 'text-slate-400'}`}>
        {explain[status]}
      </p>
      <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
        {s.todayKWh.toFixed(2)} kWh today · &#8377;{costRs(s.todayKWh).toFixed(2)} ·{' '}
        {co2Kg(s.todayKWh).toFixed(2)} kg CO&#8322;
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">
        Switched on: {s.appliancesOn.length > 0 ? s.appliancesOn.map((k) => APPLIANCE_LABELS[k] ?? k).join(', ') : 'nothing'}
      </div>

      <button
        type="button"
        onClick={() => toggleOccupied(room.id)}
        className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
          s.occupied
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
        }`}
      >
        {s.occupied ? 'Set room to Empty' : 'Set room to Occupied'}
      </button>
    </div>
  );
}
