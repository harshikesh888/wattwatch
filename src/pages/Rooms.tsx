import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { APPLIANCE_KEYS, APPLIANCE_LABELS } from '../data/rooms';
import { co2Kg, costRs } from '../lib/calculations';
import { useEnergy } from '../lib/store';
import { Hint, Panel } from '../components/ui';

export default function Rooms() {
  const { rooms, live, readings, roomStatus, toggleOccupied, toggleAppliance } = useEnergy();

  return (
    <div className="page-enter flex flex-col gap-4">
      <Panel title="Control each room" subtitle="Simulate the campus: flip occupancy, switch appliances, and watch detection react.">
        <Hint>
          <span className="font-semibold text-slate-100">To trigger an alert:</span> pick an occupied room,
          leave its appliances ON, and press <span className="font-semibold text-amber-200">“Set room to Empty”</span>.
          A waste alert fires within 2 readings (~10s).
        </Hint>
      </Panel>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rooms.map((room) => {
          const s = live[room.id];
          if (!s) return null;
          const status = roomStatus(room.id);
          const spark = (readings[room.id] ?? []).map((r) => ({ p: r.power_kW }));
          return (
            <div
              key={room.id}
              className={`rounded-2xl border p-4 shadow-xl shadow-black/30 ${status === 'wasting' ? 'border-red-500/70 bg-red-950/20 waste-pulse' : 'border-slate-800 bg-slate-900/70'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-lg font-black text-slate-50">{room.name}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-slate-500">
                    {room.type} · {room.capacity} seats
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <span className={s.occupied ? 'font-semibold text-emerald-300' : 'text-slate-400'}>
                    {s.occupied ? 'Occupied' : 'Empty'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.occupied}
                    aria-label={`Toggle occupancy for ${room.name}`}
                    onClick={() => toggleOccupied(room.id)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${s.occupied ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${s.occupied ? 'left-[22px]' : 'left-0.5'}`}
                    />
                  </button>
                </label>
              </div>

              <div className="mt-2 h-[90px] w-full" title={`Recent power history for ${room.name}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spark} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <Area
                      type="monotone"
                      dataKey="p"
                      stroke={status === 'wasting' ? '#f87171' : '#22d3ee'}
                      fill={status === 'wasting' ? '#f87171' : '#22d3ee'}
                      fillOpacity={0.2}
                      strokeWidth={1.6}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-mono text-xl font-black tabular-nums text-slate-50">
                  {s.power_kW.toFixed(2)} kW
                </span>
                <span className="text-xs text-slate-400">right now</span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  {s.todayKWh.toFixed(2)} kWh today · &#8377;{costRs(s.todayKWh).toFixed(2)} ·{' '}
                  {co2Kg(s.todayKWh).toFixed(2)} kg CO&#8322;
                </span>
              </div>

              <div className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Appliances — tap to switch on/off
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {APPLIANCE_KEYS.map((k) => {
                  const on = s.appliancesOn.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleAppliance(room.id, k)}
                      className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                        on
                          ? 'border-amber-400/60 bg-amber-400/15 text-amber-100'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`mb-0.5 inline-block rounded px-1.5 py-px font-mono text-[10px] font-black ${on ? 'bg-amber-400/25 text-amber-200' : 'bg-slate-700/60 text-slate-400'}`}>
                        {on ? 'ON' : 'OFF'}
                      </span>
                      <span className="block">{APPLIANCE_LABELS[k]}</span>
                      <span className="block font-mono text-[10px] font-normal opacity-70">
                        {k === 'lights' && `${room.appliances.lights_kW} kW`}
                        {k === 'fans' && `${room.appliances.fans_kW} kW`}
                        {k === 'ac' && `${room.appliances.ac_kW} kW`}
                        {k === 'projector' && `${room.appliances.projector_kW} kW`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
