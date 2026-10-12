import type { ReactNode } from 'react';
import { InfoIcon } from './icons';

/** Consistent dark panel with optional title row. */
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
      className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/30 backdrop-blur md:p-5 ${className ?? ''}`}
    >
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-start gap-2">
          <div>
            {title && (
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-100">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{subtitle}</p>}
          </div>
          {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Blue info callout for plain-language explanations. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] p-3 text-sm leading-relaxed text-slate-300">
      <span className="mt-0.5 shrink-0 text-cyan-300">
        <InfoIcon className="h-4 w-4" />
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
    <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-300">
        {icon}
      </span>
      <div>
        <div className="text-sm font-bold text-slate-100">
          <span className="mr-1.5 font-mono text-xs text-slate-500">{n}</span>
          {title}
        </div>
        <div className="mt-0.5 text-xs leading-relaxed text-slate-400">{text}</div>
      </div>
    </div>
  );
}
