import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ROOMS } from '../data/rooms';
import { useAuth } from '../lib/auth';
import { REPORT_CATEGORIES } from '../lib/reports';
import type { ReportStatus } from '../lib/reports';
import { useReports } from '../lib/reports';
import { useToast } from '../lib/toast';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Hint, Panel } from '../components/ui';

const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500';

export default function Reports() {
  const { user, roomNameOf } = useAuth();
  const { reports, setStatus, addReport } = useReports();
  const { push } = useToast();
  const [roomId, setRoomId] = useState(user?.roomId ?? ROOMS[0]?.id ?? '');
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState<'mine' | 'all'>('all');

  if (!user) {
    return (
      <div className="page-enter mx-auto max-w-md">
        <EmptyState
          title="Login required"
          description="Log in to pick a problem in your room and raise a report for the facility team."
          actionText="Go to login"
          onAction={() => window.location.assign('/login')}
        />
        <p className="mt-3 text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-emerald-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  const visible = filter === 'mine' ? reports.filter((r) => r.reporterId === user.id) : reports;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 5) {
      push('error', 'Please describe the problem in a few words (min 5 characters).');
      return;
    }
    const r = addReport({ roomId, category, description, reporterId: user.id, reporterName: user.name });
    setDescription('');
    push('success', `Report ${r.id} raised for ${ROOMS.find((x) => x.id === roomId)?.name ?? roomId}.`);
  };

  const roomName = (id: string) => ROOMS.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="page-enter flex flex-col gap-6">
      <Panel
        title="Room problem reports"
        subtitle={`Logged in as ${user.name} · your room is ${roomNameOf(user)}. Raise an issue in 3 steps: pick room → pick problem → describe it.`}
      >
        <Hint>
          Reports are for <span className="font-semibold text-slate-800">faults</span> (broken AC, fused
          lights, dead projector). For <span className="font-semibold text-slate-800">live waste</span> (empty
          room left on), use the <span className="font-semibold text-rose-700">Alerts</span> tab instead.
        </Hint>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 self-start rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-1"
        >
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Raise a report</h2>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Which room?
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputCls}>
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            What&apos;s wrong?
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Describe it
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. AC runs all night in empty LH-2, room stays cold…"
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-3 py-2.5 font-bold text-white hover:bg-emerald-700"
          >
            Raise report
          </button>
        </form>

        <Panel
          title="Track reports"
          subtitle="Status moves Open → In progress → Resolved as the facility team acts."
          className="lg:col-span-2"
          right={
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(['all', 'mine'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    filter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'mine' ? 'Mine' : `All (${reports.length})`}
                </button>
              ))}
            </div>
          }
        >
          {visible.length === 0 ? (
            <EmptyState
              title="No reports here"
              description={filter === 'mine' ? 'You have not raised any reports yet.' : 'No reports raised yet. Be the first.'}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((r) => (
                <ReportCard
                  key={r.id}
                  id={r.id}
                  room={roomName(r.roomId)}
                  category={r.category}
                  description={r.description}
                  reporter={r.reporterName}
                  createdAt={r.createdAt}
                  status={r.status}
                  onStatus={(s) => {
                    setStatus(r.id, s);
                    push('success', s === 'resolved' ? `Report ${r.id} marked fixed.` : `Report ${r.id} → ${s}.`);
                  }}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ReportCard({
  id,
  room,
  category,
  description,
  reporter,
  createdAt,
  status,
  onStatus,
}: {
  id: string;
  room: string;
  category: string;
  description: string;
  reporter: string;
  createdAt: number;
  status: ReportStatus;
  onStatus: (s: ReportStatus) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-extrabold text-slate-900">{room}</span>
        <StatusBadge tone={status === 'open' ? 'rose' : status === 'in-progress' ? 'amber' : 'emerald'}>
          {status === 'open' ? 'Open' : status === 'in-progress' ? 'In progress' : 'Fixed'}
        </StatusBadge>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-400">
          {new Date(createdAt).toLocaleString('en-IN')}
        </span>
      </div>
      <div className="mt-0.5 text-xs font-semibold text-emerald-700">{category}</div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
        <span className="text-xs text-slate-400">
          Reported by {reporter} · {id}
        </span>
        <span className="ml-auto flex gap-1.5">
          {status === 'open' && (
            <button
              type="button"
              onClick={() => onStatus('in-progress')}
              className="border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Start work
            </button>
          )}
          {status === 'in-progress' && (
            <button
              type="button"
              onClick={() => onStatus('resolved')}
              className="inline-flex items-center gap-1 bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Mark Fixed
            </button>
          )}
          {status === 'resolved' && (
            <button
              type="button"
              onClick={() => onStatus('open')}
              className="border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Reopen
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
