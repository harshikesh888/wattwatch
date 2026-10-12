import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { ROOMS } from '../data/rooms';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export default function Signup() {
  const { signup } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomId, setRoomId] = useState(ROOMS[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = signup(name, email, password, roomId);
    if (err) {
      setError(err);
      push('error', err);
    } else {
      push('success', 'Account created — you can now raise reports.');
      navigate('/reports');
    }
  };

  const inputCls =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500';

  return (
    <div className="page-enter mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Join WattWatch</h2>
            <p className="text-xs text-slate-500">Pick your room — new reports will default to it.</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Your name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@campus.edu" className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Password <span className="font-normal text-slate-400">(min 4 characters)</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
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
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-3 py-2.5 font-bold text-white hover:bg-emerald-700"
          >
            Create account
          </button>
        </form>
        <p className="border-t border-slate-100 p-4 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
