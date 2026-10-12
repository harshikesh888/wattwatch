import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ROOMS } from '../data/rooms';
import { useAuth } from '../lib/auth';
import { REPORT_CATEGORIES } from '../lib/reports';
import type { ReportStatus } from '../lib/reports';
import { useReports } from '../lib/reports';
import { Hint, Panel } from '../components/ui';

const statusStyle: Record<ReportStatus, string> = {
  open: 'bg-red-500/15 text-red-200 border-red-500/40',
  'in-progress': 'bg-amber-500/15 text-amber-200 border-amber-500/40',
  resolved: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40',
};

const statusLabel: Record<ReportStatus, string> = {
  open: 'OPEN — waiting for action',
  'in-progress': 'IN PROGRESS — being fixed',
  resolved: 'RESOLVED — fixed',
};

const inputCls =
  'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-500';

export default function Reports() {
  const { user, roomNameOf } = useAuth();
  const { reports, setStatus, addReport } = useReports();
  const [roomId, setRoomId] = useState(user?.roomId ?? ROOMS[0]?.id ?? '');
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState<'mine' | 'all'>('all');
  const [flash, setFlash] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="page-enter mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-xl shadow-black/30">
        <h2 className="font-mono text-lg font-black text-slate-50">Login required</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          Log in to pick a problem in your room and raise a report for the facility team.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/login" className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400">
            Log in
          </Link>
          <Link to="/signup" className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const visible = filter === 'mine' ? reports.filter((r) => r.reporterId === user.id) : reports;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 5) {
      setFlash('Please describe the problem in a few words (min 5 characters).');
      return;
    }
    const r = addReport({
      roomId,
      category,
      description,
      reporterId: user.id,
      reporterName: user.name,
    });
    setDescription('');
    setFlash(`Raised ${r.id} for ${ROOMS.find((x) => x.id === roomId)?.name ?? roomId} — the facility team can now see it below.`);
  };

  const roomName = (id: string) => ROOMS.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="page-enter flex flex-col gap-4">
      <Panel
        title="Room problem reports"
        subtitle={`Logged in as ${user.name} · your room is ${roomNameOf(user)}. Raise an issue in 3 steps: pick room → pick problem → describe it.`}
      >
        <Hint>
          Reports are for <span className="font-semibold text-slate-100">faults</span> (broken AC, fused
          lights, dead projector). For <span className="font-semibold text-slate-100">live waste</span> (empty
          room left on), use the <span className="font-semibold text-red-200">Alerts</span> tab instead.
        </Hint>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/30 lg:col-span-1"
        >
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">1 · Raise a report</h2>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Which room?
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputCls}>
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            What's wrong?
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Describe it
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. AC runs all night in empty LH-2, room stays cold…"
              className={inputCls}
            />
          </label>
          {flash && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-200">
              {flash}
            </div>
          )}
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-3 py-2.5 font-black text-slate-950 hover:bg-emerald-400"
          >
            Raise report
          </button>
        </form>

        <Panel
          title="2 · Track reports"
          subtitle="Status moves Open → In progress → Resolved as the facility team acts."
          className="lg:col-span-2"
          right={
            <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              {(['all', 'mine'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    filter === f ? 'bg-slate-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f === 'mine' ? 'Mine' : `All (${reports.length})`}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex flex-col gap-2.5">
            {visible.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                No reports here yet — raise the first one on the left.
              </div>
            )}
            {visible.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-black text-slate-50">{roomName(r.roomId)}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-black ${statusStyle[r.status]}`}>
                    {statusLabel[r.status]}
                  </span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-500">
                    {new Date(r.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-0.5 text-xs font-semibold text-cyan-300">{r.category}</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{r.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Reported by {r.reporterName} · {r.id}
                  </span>
                  <span className="ml-auto flex gap-1.5">
                    {r.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => setStatus(r.id, 'in-progress')}
                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-200 hover:bg-amber-500/20"
                      >
                        Start work
                      </button>
                    )}
                    {r.status === 'in-progress' && (
                      <button
                        type="button"
                        onClick={() => setStatus(r.id, 'resolved')}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Mark fixed
                      </button>
                    )}
                    {r.status === 'resolved' && (
                      <button
                        type="button"
                        onClick={() => setStatus(r.id, 'open')}
                        className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-black text-slate-300 hover:bg-slate-800"
                      >
                        Reopen
                      </button>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
