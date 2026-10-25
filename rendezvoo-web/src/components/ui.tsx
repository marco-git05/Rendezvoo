import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/* ---------- Header ---------- */

export function Header({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="header">
      {back ? (
        <button className="icon-btn" aria-label="Go back" onClick={() => navigate(-1)}>
          ‹
        </button>
      ) : null}
      <div className="header-text">
        <h1 className="title">{title}</h1>
        {subtitle ? <p className="caption muted">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

export function IconButton({
  glyph,
  label,
  onClick,
}: {
  glyph: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="icon-btn" aria-label={label} onClick={onClick}>
      {glyph}
    </button>
  );
}

/* ---------- Card ---------- */

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button className={`card ${className}`} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <div className={`card ${className}`}>{children}</div>;
}

/* ---------- Buttons & chips ---------- */

export function Button({
  variant = 'primary',
  ...props
}: { variant?: 'primary' | 'accent' | 'ghost' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn ${variant === 'primary' ? '' : variant}`} />;
}

export function Chip({
  label,
  selected,
  onClick,
  tone = 'primary',
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  tone?: 'primary' | 'accent';
}) {
  if (!onClick) {
    return (
      <span className={`chip static ${tone === 'accent' ? 'accent' : ''}`} aria-pressed={selected}>
        {label}
      </span>
    );
  }
  return (
    <button
      className={`chip ${tone === 'accent' ? 'accent' : ''}`}
      aria-pressed={!!selected}
      onClick={onClick}>
      {label}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      onClick={() => onChange(!checked)}
    />
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ label, color, size = 48 }: { label: string; color: string; size?: number }) {
  return (
    <div
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

/* ---------- Inputs ---------- */

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="label muted">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="heading section-title">{children}</h2>;
}
