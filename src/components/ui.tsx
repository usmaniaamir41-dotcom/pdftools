import React from 'react';

export const inputCls =
  'w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500';

export const Field: React.FC<{ label: React.ReactNode; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = ''
}) => (
  <label className={`block text-sm ${className}`}>
    <span className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">{label}</span>
    {children}
    {hint && <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
  </label>
);

export function Segmented<T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { value: T; label: string; desc?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`px-3.5 py-2 rounded-xl border text-left text-sm transition-all duration-200 ${
              on
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm scale-[1.02]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
          >
            <div>{o.label}</div>
            {o.desc && <div className="text-[10px] opacity-70 font-normal">{o.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 select-none"
  >
    <span
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : ''}`}
      />
    </span>
    {label}
  </button>
);

export const ProgressBar: React.FC<{ pct: number; label?: string }> = ({ pct, label }) => (
  <div className="space-y-2 animate-fade-in" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span className="truncate pr-3">{label || 'Processing…'}</span>
      <span className="tabular-nums text-indigo-600 dark:text-indigo-400">{Math.round(pct)}%</span>
    </div>
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
    </div>
  </div>
);

export const SuccessBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3 animate-pop-in">
    <span className="success-ring shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path className="check-path" d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
    <span>{children}</span>
  </div>
);
