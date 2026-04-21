"use client";

import { cn } from "@/lib/utils";
import { DripIcon } from "./drip-icons";

/* ─── Sparkline ─── */
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
}

export function Sparkline({ data, color = "var(--accent)", height = 36, width = 120, fill = true }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
  const d = "M" + pts.map((p) => p.join(",")).join(" L");
  const area = d + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Liquid progress bar ─── */
interface LiquidProps {
  pct: number;
  color?: string;
  height?: number;
  className?: string;
}

export function Liquid({ pct, color = "var(--accent)", height = 6, className }: LiquidProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("w-full overflow-hidden rounded-full", className)} style={{ height, background: "var(--line-soft)" }}>
      <div
        className="h-full rounded-full relative transition-all duration-400"
        style={{
          width: `${clamped}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
        }}
      >
        {clamped > 4 && clamped < 100 && (
          <div
            className="absolute right-[-3px] top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: height + 2,
              height: height + 2,
              background: color,
              boxShadow: `0 0 0 2px var(--bg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Pill ─── */
const PILL_TONES = {
  neutral: { bg: "var(--line-soft)", fg: "var(--ink-2)" },
  accent: { bg: "rgba(63,76,217,0.12)", fg: "var(--accent)" },
  green: { bg: "rgba(47,158,92,0.12)", fg: "#1f7a46" },
  red: { bg: "rgba(196,91,122,0.12)", fg: "#9a3858" },
  amber: { bg: "rgba(217,122,60,0.14)", fg: "#9a501f" },
  purple: { bg: "rgba(168,91,196,0.14)", fg: "#7a3da0" },
  blue: { bg: "rgba(91,138,196,0.14)", fg: "#3a6aa0" },
} as const;

interface PillProps {
  children: React.ReactNode;
  tone?: keyof typeof PILL_TONES;
  className?: string;
}

export function Pill({ children, tone = "neutral", className }: PillProps) {
  const t = PILL_TONES[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", className)}
      style={{ background: t.bg, color: t.fg }}
    >
      {children}
    </span>
  );
}

/* ─── Category badge ─── */
interface CatBadgeProps {
  name: string;
  icon?: string | null;
  color?: string | null;
}

export function CatBadge({ name, icon, color = "#6366f1" }: CatBadgeProps) {
  const c = color || "#6366f1";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ background: `color-mix(in oklch, ${c} 12%, transparent)`, color: c }}
    >
      <span
        className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center"
        style={{ background: `color-mix(in oklch, ${c} 22%, transparent)` }}
      >
        {icon ? <DripIcon name={icon} size={10} /> : <span className="text-[9px]">{name[0]}</span>}
      </span>
      {name}
    </span>
  );
}

/* ─── PerDay — signature "/day" lockup ─── */
const PER_DAY_SIZES = {
  sm: { num: 18, day: 11 },
  md: { num: 28, day: 13 },
  lg: { num: 44, day: 15 },
  xl: { num: 64, day: 18 },
  xxl: { num: 88, day: 22 },
} as const;

interface PerDayProps {
  amount: number;
  size?: keyof typeof PER_DAY_SIZES;
  color?: string;
  decimals?: number;
}

export function PerDay({ amount, size = "md", color, decimals = 2 }: PerDayProps) {
  const s = PER_DAY_SIZES[size];
  const abs = Math.abs(amount);
  const str = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [whole, frac] = str.split(".");
  return (
    <span
      className="inline-flex items-baseline font-num"
      style={{ color: color || "var(--ink)", letterSpacing: "-0.02em" }}
    >
      <span style={{ fontSize: s.day, marginRight: 1, opacity: 0.55 }}>
        {amount < 0 ? "\u2212" : ""}$
      </span>
      <span style={{ fontSize: s.num, fontWeight: 500, lineHeight: 1 }}>{whole}</span>
      <span style={{ fontSize: Math.round(s.num * 0.55), fontWeight: 500, opacity: 0.5 }}>.{frac}</span>
      <span
        className="font-sans italic"
        style={{ fontSize: s.day, marginLeft: 4, opacity: 0.5 }}
      >
        /day
      </span>
    </span>
  );
}

/* ─── Money — amount display without /day ─── */
const MONEY_SIZES = { sm: 13, md: 16, lg: 22, xl: 32, xxl: 48 } as const;

interface MoneyProps {
  amount: number;
  size?: keyof typeof MONEY_SIZES;
  color?: string;
  decimals?: number;
  signed?: boolean;
}

export function Money({ amount, size = "md", color, decimals = 2, signed = false }: MoneyProps) {
  const fs = MONEY_SIZES[size];
  const abs = Math.abs(amount);
  const str = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [whole, frac] = str.split(".");
  const sign = amount < 0 ? "\u2212" : signed && amount > 0 ? "+" : "";
  return (
    <span
      className="font-num font-medium"
      style={{ color: color || "var(--ink)", letterSpacing: "-0.015em" }}
    >
      <span style={{ opacity: 0.55 }}>{sign}$</span>
      <span style={{ fontSize: fs }}>{whole}</span>
      <span style={{ fontSize: Math.round(fs * 0.65), opacity: 0.55 }}>.{frac}</span>
    </span>
  );
}

/* ─── SectionHead ─── */
interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHead({ eyebrow, title, children, className }: SectionHeadProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4", className)}>
      <div>
        {eyebrow && (
          <div className="drip-eyebrow mb-1.5" style={{ color: "var(--ink-3)" }}>
            {eyebrow}
          </div>
        )}
        <h2
          className="font-display m-0"
          style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--ink)" }}
        >
          {title}
        </h2>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}

/* ─── Drip Card ─── */
interface DripCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
}

export function DripCard({ children, className, padding = 20, style, onClick, onMouseEnter, onMouseLeave }: DripCardProps) {
  return (
    <div
      className={cn("drip-card", className)}
      style={{ padding, ...style }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

/* ─── DripButton ─── */
interface DripButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "default" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: string;
}

const BTN_SIZES = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5 h-[30px]",
  md: "px-3.5 py-2 text-[13px] gap-2 h-9",
  lg: "px-4.5 py-2.5 text-sm gap-2 h-11",
};

const BTN_VARIANTS = {
  primary: "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]",
  accent: "bg-[var(--accent)] text-white border-[var(--accent)]",
  default: "bg-[var(--card-bg)] text-[var(--ink)] border-[var(--line)]",
  ghost: "bg-transparent text-[var(--ink-2)] border-transparent",
  outline: "bg-transparent text-[var(--ink)] border-[var(--line)]",
  danger: "bg-transparent text-[#9a3858] border-transparent",
};

export function DripButton({ variant = "default", size = "md", icon, children, className, ...rest }: DripButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg border font-medium cursor-pointer transition-all duration-150",
        BTN_SIZES[size],
        BTN_VARIANTS[variant],
        className
      )}
      style={{ fontFamily: "inherit", letterSpacing: "-0.005em" }}
      {...rest}
    >
      {icon && <DripIcon name={icon} size={14} />}
      {children}
    </button>
  );
}

/* ─── Checkbox ─── */
export function DripCheckbox({ checked, onChange }: { checked: boolean; onChange?: () => void }) {
  return (
    <div
      className="w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-all duration-150"
      style={{
        border: `1.5px solid ${checked ? "var(--accent)" : "var(--line)"}`,
        background: checked ? "var(--accent)" : "transparent",
        color: "white",
      }}
      onClick={onChange}
    >
      {checked && <DripIcon name="check" size={10} />}
    </div>
  );
}

/* ─── Select ─── */
interface DripSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function DripSelect({ value, onChange, options, className }: DripSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border px-3 py-1.5 pr-7 text-[12.5px] cursor-pointer"
        style={{
          background: "var(--bg-2)",
          borderColor: "var(--line)",
          color: "var(--ink)",
          fontFamily: "inherit",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <DripIcon
        name="chevron-down"
        size={12}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--ink-3)" }}
      />
    </div>
  );
}

/* ─── Label ─── */
export function DripLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="drip-eyebrow" style={{ color: "var(--ink-3)" }}>
      {children}
    </div>
  );
}

/* ─── Input style ─── */
export const dripInputClass =
  "w-full rounded-md border px-2.5 py-1.5 text-[13px] outline-none bg-[var(--card-bg)] border-[var(--line)] text-[var(--ink)]";

/* ─── Helpers ─── */
export function fmtMoney(n: number, opts: { signed?: boolean; decimals?: number } = {}): string {
  const { signed = false, decimals = 2 } = opts;
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (signed) return (n < 0 ? "\u2212" : n > 0 ? "+" : "") + "$" + s;
  return (n < 0 ? "\u2212" : "") + "$" + s;
}

export function fmtDaily(n: number, opts: { decimals?: number } = {}): string {
  const { decimals = 2 } = opts;
  const abs = Math.abs(n);
  return "$" + abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + "/day";
}
