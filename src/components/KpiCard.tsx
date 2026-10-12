import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  badge?: { text: string; variant: 'emerald' | 'rose' | 'amber' | 'slate' | 'blue' };
  actionText?: string;
  onAction?: () => void;
}

const badgeClasses = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

const tileClasses = {
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  slate: 'bg-slate-50 text-slate-600',
  blue: 'bg-blue-50 text-blue-600',
};

export default function KpiCard({ label, value, sublabel, icon: Icon, badge, actionText, onAction }: KpiCardProps) {
  const tone = badge?.variant ?? 'slate';
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all group-hover:scale-105 ${tileClasses[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
          {value}
        </span>
        {badge && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${badgeClasses[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        {sublabel && <span className="truncate pr-2">{sublabel}</span>}
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="ml-auto shrink-0 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            {actionText} &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
