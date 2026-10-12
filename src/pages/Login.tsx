import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BoltIcon, CheckIcon } from '../components/icons';
import { useAuth } from '../lib/auth';

const inputCls =
  'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-500';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@campus.edu');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = login(email, password);
    if (err) setError(err);
    else navigate('/reports');
  };

  return (
    <div className="page-enter mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/60 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
            <BoltIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-mono text-xl font-black text-slate-50">Welcome back</h2>
            <p className="text-xs text-slate-400">Log in to report room problems and track fixes.</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
            />
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
            Log in
          </button>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-400">
            <span className="font-bold text-slate-200">Demo account (prefilled):</span>{' '}
            <span className="font-mono text-cyan-300">demo@campus.edu / demo123</span> — just press Log in.
          </div>
        </form>
        <p className="border-t border-slate-800 p-4 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/signup" className="font-bold text-cyan-300 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-400">
        {['Report a faulty AC, light or projector in 30 seconds', 'Watch its status move from Open to Fixed'].map((t) => (
          <span key={t} className="flex items-center gap-2">
            <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> {t}
          </span>
        ))}
      </div>
    </div>
  );
}
