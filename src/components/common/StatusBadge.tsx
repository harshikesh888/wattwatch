import type { ReactNode } from 'react';

type Tone = 'emerald' | 'rose' | 'amber' | 'slate' | 'sky';

const tones: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
};

export function StatusBadge({
  tone = 'slate',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}
