import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BoltIcon } from '../components/icons';
import { ROOMS } from '../data/rooms';
import { useAuth } from '../lib/auth';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomId, setRoomId] = useState(ROOMS[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = signup(name, email, password, roomId);
    if (err) setError(err);
    else navigate('/reports');
  };

  const inputCls =
    'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-500';

  return (
    <div className="page-enter mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/60 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
            <BoltIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-mono text-xl font-black text-slate-50">Join WattWatch</h2>
            <p className="text-xs text-slate-400">Pick your room — new reports will default to it.</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Your name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@campus.edu" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Password <span className="font-normal text-slate-500">(min 4 characters)</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Your room
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputCls}>
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.type}, {r.capacity} seats
                </option>
              ))}
            </select>
          </label>
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-3 py-2.5 font-black text-slate-950 hover:bg-emerald-400"
          >
            Create account
          </button>
        </form>
        <p className="border-t border-slate-800 p-4 text-center text-sm text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-cyan-300 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
