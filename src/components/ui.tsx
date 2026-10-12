import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

/** White content panel with optional title row. */
export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 ${className ?? ''}`}
    >
      {(title || right) && (
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Light info callout for plain-language explanations. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-sm leading-relaxed text-slate-600">
      <span className="mt-0.5 shrink-0 text-sky-600">
        <Info className="h-4 w-4" />
      </span>
      <div>{children}</div>
    </div>
  );
}

/** Numbered step used in "how it works" strips. */
export function Step({
  n,
  icon,
  title,
  text,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-700">
        {icon}
      </span>
      <div>
        <div className="text-sm font-bold text-slate-900">
          <span className="mr-1.5 font-mono text-xs text-slate-400">{n}</span>
          {title}
        </div>
        <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{text}</div>
      </div>
    </div>
  );
}
