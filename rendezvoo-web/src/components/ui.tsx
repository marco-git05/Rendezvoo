'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-brand text-white border-brand hover:brightness-95',
  secondary: 'bg-card text-ink border-line hover:bg-bg',
  danger: 'bg-card text-danger border-line hover:bg-red-50',
  ghost: 'bg-transparent text-brand border-transparent hover:bg-brand-soft',
};
type Variant = keyof typeof variants;

export const btnClass = (variant: Variant = 'primary', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition ` +
  `disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${extra}`;

export function Button({
  variant = 'primary', loading, className = '', children, disabled, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading} className={btnClass(variant, className)}>
      {loading ? <Spinner small /> : children}
    </button>
  );
}

export function ButtonLink({ href, variant = 'primary', className = '', children }: {
  href: string; variant?: Variant; className?: string; children: ReactNode;
}) {
  return <Link href={href} className={btnClass(variant, className)}>{children}</Link>;
}

const inputClass =
  'rounded-xl border border-line bg-card px-3.5 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:opacity-60';

export function Field({ label, hint, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & {
  label: string; hint?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold text-muted">{label}</span>
      <input {...props} className={inputClass} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-semibold text-muted">{label}</span>}
      <textarea rows={3} {...props} className={inputClass} />
    </label>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">{children}</h2>;
}

export function Empty({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${small ? 'h-4 w-4' : 'mx-auto my-8 h-7 w-7 text-brand'}`}
    />
  );
}

export function ErrorText({ error }: { error?: string }) {
  return error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null;
}

export function Chip({ label, selected, onClick, disabled }: {
  label: string; selected?: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        selected ? 'border-brand bg-brand text-white' : 'border-line bg-card hover:border-brand'
      }`}
    >
      {label}
    </button>
  );
}

export function Switch({ checked, onChange, disabled, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; hint?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p>{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function Avatar({ src, name, size = 40 }: { src?: string | null; name?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? ''} style={style} className="shrink-0 rounded-full object-cover" />;
  }
  const initials = (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return (
    <span
      style={{ ...style, fontSize: size * 0.38 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand"
    >
      {initials || '?'}
    </span>
  );
}

export function PageHeader({ title, back, right, subtitle }: {
  title: ReactNode; back?: string; right?: ReactNode; subtitle?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {back && <Link href={back} className="w-fit text-sm font-semibold text-brand">← Back</Link>}
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">{title}</h1>
        {right}
      </div>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
