import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  meaning: string;
  value: string;
  sub?: string;
  badge: string;
  icon: ReactNode;
  tone: 'cyan' | 'amber' | 'red' | 'green';
}

const toneText: Record<KpiCardProps['tone'], string> = {
  cyan: 'text-cyan-300',
  amber: 'text-amber-300',
  red: 'text-red-300',
  green: 'text-emerald-300',
};

const toneBadge: Record<KpiCardProps['tone'], string> = {
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

const toneBar: Record<KpiCardProps['tone'], string> = {
  cyan: 'from-cyan-500 to-cyan-500/0',
  amber: 'from-amber-500 to-amber-500/0',
  red: 'from-red-500 to-red-500/0',
  green: 'from-emerald-500 to-emerald-500/0',
};

export default function KpiCard({ label, meaning, value, sub, badge, icon, tone }: KpiCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5">
      <div className={`h-1 bg-gradient-to-r ${toneBar[tone]}`} />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${toneText[tone]}`}>
            {icon}
            {label}
          </span>
          <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${toneBadge[tone]}`}>
            {badge}
          </span>
        </div>
        <div className="mt-2 font-mono text-2xl font-black tabular-nums text-slate-50 md:text-[1.7rem]">
          {value}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">{meaning}</div>
        {sub && <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}
