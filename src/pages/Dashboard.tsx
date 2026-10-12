import { AlertTriangle, FlaskConical, IndianRupee, Leaf, PlugZap, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AlertList from '../components/AlertList';
import KpiCard from '../components/KpiCard';
import LiveChart from '../components/LiveChart';
import RoomCard from '../components/RoomCard';
import { Hint, Panel, Step } from '../components/ui';
import { useToast } from '../lib/toast';
import { useEnergy } from '../lib/store';

export default function Dashboard() {
  const { rooms, totals, activeAlerts, tickMs, setTickMs, triggerDemoWaste, emptyAll, fillAll, tick } = useEnergy();
  const { push } = useToast();
  const navigate = useNavigate();

  return (
    <div className="page-enter flex flex-col gap-6">
      <Panel
        title="How WattWatch works"
        subtitle="Sensor readings stream in every few seconds. Red means an empty room is burning power right now."
      >
        <div className="grid gap-2.5 md:grid-cols-3">
          <Step
            n="1"
            icon={<Zap className="h-4 w-4" />}
            title="Sense"
            text="Every room reports live power (kW), occupancy and which appliances are on."
          />
          <Step
            n="2"
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Detect"
            text="Empty room drawing over 0.2 kW for 2 readings in a row raises a waste alert."
          />
          <Step
            n="3"
            icon={<Leaf className="h-4 w-4" />}
            title="Save"
            text="Hit Mark Fixed to switch the room off. The meter stops and savings add up below."
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Live load"
          value={`${totals.liveKw.toFixed(2)} kW`}
          sublabel={`Reading #${tick} · refreshes every ${tickMs / 1000}s`}
          icon={Zap}
          badge={{ text: 'live', variant: 'blue' }}
        />
        <KpiCard
          label="Used today"
          value={`${totals.todayKwh.toFixed(2)} kWh`}
          sublabel="Lights + fans + AC + projectors, all rooms"
          icon={PlugZap}
          badge={{ text: 'kWh', variant: 'amber' }}
          actionText="View rooms"
          onAction={() => navigate('/rooms')}
        />
        <KpiCard
          label="Money wasted"
          value={`₹${totals.wastedRs.toFixed(2)}`}
          sublabel={`${totals.wastedKwh.toFixed(3)} kWh wasted @ ₹8/unit`}
          icon={IndianRupee}
          badge={{ text: totals.wastedKwh > 0.01 ? 'burning' : 'clean', variant: totals.wastedKwh > 0.01 ? 'rose' : 'emerald' }}
          actionText="See alerts"
          onAction={() => navigate('/alerts')}
        />
        <KpiCard
          label="CO₂ emitted"
          value={`${totals.co2Kg.toFixed(2)} kg`}
          sublabel={`${totals.trees.toFixed(2)} trees to absorb · ≈${Math.round(totals.phones)} phone charges`}
          icon={Leaf}
          badge={{ text: 'CO₂', variant: 'emerald' }}
          actionText="Impact"
          onAction={() => navigate('/impact')}
        />
      </div>

      <Panel
        title="Live power — all rooms"
        subtitle="Each line is one room's draw over time. Spikes in an empty room mean waste."
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 live-dot" /> STREAMING
          </span>
        }
      >
        <LiveChart />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title={`Needs attention (${activeAlerts.length})`}
          subtitle="Empty rooms burning power. Mark one fixed to switch it off."
          className="lg:col-span-2"
        >
          <AlertList alerts={activeAlerts} compact emptyText="All clear — every empty room is switched off." />
        </Panel>
        <Panel title="Try it live" subtitle="Reproduce a waste event for the demo in under 15 seconds.">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                const id = triggerDemoWaste();
                push('info', id ? `Emptied ${id} with appliances on — watch for the alert.` : 'No occupied room to empty.');
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2.5 text-sm font-bold text-white shadow-2xs hover:bg-rose-700"
            >
              <FlaskConical className="h-4 w-4" />
              Create waste (empty a live room)
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  emptyAll();
                  push('info', 'All rooms emptied — waste alerts will follow where appliances are on.');
                }}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100"
              >
                Empty all rooms
              </button>
              <button
                type="button"
                onClick={() => {
                  fillAll();
                  push('success', 'All rooms occupied — campus back to normal.');
                }}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Fill all rooms
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTickMs(5000)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${tickMs === 5000 ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Normal · 5s
              </button>
              <button
                type="button"
                onClick={() => setTickMs(1000)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${tickMs === 1000 ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Turbo · 1s
              </button>
            </div>
            <Hint>
              After emptying a room with appliances on, an alert appears within 2 readings (~10s).
            </Hint>
          </div>
        </Panel>
      </div>

      <Panel title="All rooms" subtitle="Green = in use · Red = wasting, needs action · Grey = empty and efficient.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
