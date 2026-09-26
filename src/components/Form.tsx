import type { ReactNode } from 'react';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | false;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm font-semibold text-danger">{error}</span>
      ) : (
        hint && <span className="block text-sm text-muted">{hint}</span>
      )}
    </label>
  );
}

/** Pilihan tunggal berbentuk tombol berjajar (segmented control). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-sunken p-1">
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={v === value}
          className={`min-h-11 flex-1 rounded-lg px-2 text-sm font-semibold transition-colors ${
            v === value ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(23_25_27/0.12)]' : 'text-ink-2'
          }`}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-4 py-2 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-line-strong'}`}
      >
        <span
          className={`absolute top-1 left-1 size-6 rounded-full bg-surface transition-transform ${checked ? 'translate-x-6' : ''}`}
        />
      </span>
    </button>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  hint,
  type = 'checkbox',
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  type?: 'checkbox' | 'radio';
  name?: string;
}) {
  return (
    <label className="flex min-h-12 items-start gap-3 py-2">
      <input
        type={type}
        name={name}
        className="mt-0.5 size-6 shrink-0 accent-ink"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}
