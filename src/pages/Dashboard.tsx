import AlertList from '../components/AlertList';
import { AlertIcon, BoltIcon, CashIcon, FlaskIcon, LeafIcon, PowerIcon } from '../components/icons';
import KpiCard from '../components/KpiCard';
import LiveChart from '../components/LiveChart';
import RoomCard from '../components/RoomCard';
import { Hint, Panel, Step } from '../components/ui';
import { useEnergy } from '../lib/store';

export default function Dashboard() {
  const { rooms, totals, activeAlerts, tickMs, setTickMs, triggerDemoWaste, emptyAll, fillAll, tick } = useEnergy();

  return (
    <div className="page-enter flex flex-col gap-4">
      <Panel
        title="Live campus overview"
        subtitle="Sensor readings stream in every few seconds. Red means an empty room is burning power right now."
      >
        <div className="grid gap-2.5 md:grid-cols-3">
          <Step
            n="1"
            icon={<BoltIcon className="h-4 w-4" />}
            title="Sense"
            text="Every room reports live power (kW), occupancy and which appliances are on."
          />
          <Step
            n="2"
            icon={<AlertIcon className="h-4 w-4" />}
            title="Detect"
            text="Empty room drawing over 0.2 kW for 2 readings in a row raises a waste alert."
          />
          <Step
            n="3"
            icon={<LeafIcon className="h-4 w-4" />}
            title="Save"
            text="Hit Resolve to switch the room off. The meter stops and savings add up below."
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Live load"
          meaning="Power being drawn right now, all 8 rooms together"
          value={`${totals.liveKw.toFixed(2)} kW`}
          sub={`reading #${tick} · refreshes every ${tickMs / 1000}s`}
          badge="kW"
          icon={<BoltIcon className="h-3.5 w-3.5" />}
          tone="cyan"
        />
        <KpiCard
          label="Used today"
          meaning="Total electricity consumed since morning"
          value={`${totals.todayKwh.toFixed(2)} kWh`}
          sub="lighting + fans + AC + projectors"
          badge="kWh"
          icon={<PowerIcon className="h-3.5 w-3.5" />}
          tone="amber"
        />
        <KpiCard
          label="Money wasted"
          meaning="Cost of power burned in empty rooms left ON"
          value={`\u20B9${totals.wastedRs.toFixed(2)}`}
          sub={`${totals.wastedKwh.toFixed(3)} kWh wasted @ \u20B98/unit`}
          badge="\u20B9"
          icon={<CashIcon className="h-3.5 w-3.5" />}
          tone="red"
        />
        <KpiCard
          label="CO₂ emitted"
          meaning="Climate cost of that wasted power"
          value={`${totals.co2Kg.toFixed(2)} kg`}
          sub={`needs ${totals.trees.toFixed(2)} trees to absorb · ≈${Math.round(totals.phones)} phone charges`}
          badge="CO₂"
          icon={<LeafIcon className="h-3.5 w-3.5" />}
          tone="green"
        />
      </div>

      <Panel
        title="Live power — all rooms"
        subtitle="Each colored line is one room's draw over time. Spikes in an empty room mean waste."
        right={
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 live-dot" /> STREAMING
          </span>
        }
      >
        <LiveChart />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title={`Needs attention (${activeAlerts.length})`}
          subtitle="Empty rooms burning power. Press the red button to switch one off."
          className="lg:col-span-2"
        >
          <AlertList alerts={activeAlerts} compact emptyText="All clear — every empty room is switched off." />
        </Panel>
        <Panel
          title="Try it live"
          subtitle="Reproduce a waste event for the demo in under 15 seconds."
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => triggerDemoWaste()}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-black text-white shadow-lg shadow-red-950/50 hover:bg-red-400"
            >
              <FlaskIcon className="h-4 w-4" />
              Create waste (empty a live room)
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => emptyAll()} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/20">
                Empty all rooms
              </button>
              <button type="button" onClick={() => fillAll()} className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20">
                Fill all rooms
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTickMs(5000)}
                className={`rounded-xl border px-3 py-2 text-sm font-bold ${tickMs === 5000 ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
              >
                Normal · 5s
              </button>
              <button
                type="button"
                onClick={() => setTickMs(1000)}
                className={`rounded-xl border px-3 py-2 text-sm font-bold ${tickMs === 1000 ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
              >
                Turbo · 1s
              </button>
            </div>
            <Hint>
              After emptying a room with appliances on, an alert appears above within 2 readings (~10s).
            </Hint>
          </div>
        </Panel>
      </div>

      <Panel
        title="All rooms"
        subtitle="Green = in use · Red = wasting, needs action · Grey = empty and efficient."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
