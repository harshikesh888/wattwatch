import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500';

export default function Login() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@campus.edu');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = login(email, password);
    if (err) {
      setError(err);
      push('error', err);
    } else {
      push('success', 'Logged in — welcome back.');
      navigate('/reports');
    }
  };

  return (
    <div className="page-enter mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-xs text-slate-500">Log in to report room problems and track fixes.</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
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
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-3 py-2.5 font-bold text-white hover:bg-emerald-700"
          >
            Log in
          </button>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            <span className="font-bold text-slate-700">Demo account (prefilled):</span>{' '}
            <span className="font-mono text-emerald-700">demo@campus.edu / demo123</span> — just press Log in.
          </div>
        </form>
        <p className="border-t border-slate-100 p-4 text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-emerald-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-500">
        {['Report a faulty AC, light or projector in 30 seconds', 'Watch its status move from Open to Fixed'].map((t) => (
          <span key={t} className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {t}
          </span>
        ))}
      </div>
    </div>
  );
}
