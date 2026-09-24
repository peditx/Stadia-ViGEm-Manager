import { useState, ButtonHTMLAttributes } from "react";
import { RefreshCw } from "lucide-react";
import { Theme } from "../lib/types";
import { onColor } from "../lib/color";

// --- M3 section label (overline) ---
export function Overline({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-on-surface-variant">
        {children}
      </span>
      {action}
    </div>
  );
}

// --- M3 buttons: filled / tonal / outlined / text, pill shape ---
type BtnVariant = "filled" | "tonal" | "outlined" | "text" | "danger";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  theme?: Theme;
  small?: boolean;
}
export function Btn({ variant = "tonal", theme, small, className = "", style, ...rest }: BtnProps) {
  const size = small ? "h-8 px-3 text-xs" : "h-10 px-6 text-sm";
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none";
  const variants: Record<BtnVariant, string> = {
    filled: "",
    tonal: "bg-surface-high text-on-surface hover:bg-surface-highest",
    outlined: "border border-outline text-on-surface hover:bg-white/5",
    text: theme ? `${theme.text} hover:bg-white/5` : "text-primary hover:bg-white/5",
    danger: "border border-error/40 text-error hover:bg-error/10",
  };
  const filledStyle =
    variant === "filled" && theme
      ? { backgroundColor: theme.hex, color: onColor(theme.hex), ...style }
      : style;
  return (
    <button
      className={`${base} ${size} ${variant === "filled" ? "hover:brightness-110 active:brightness-95" : ""} ${variants[variant]} ${className}`}
      style={filledStyle}
      {...rest}
    />
  );
}

// --- M3 icon button ---
export function IconBtn({ className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-9 h-9 inline-flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white/[0.08] hover:text-on-surface transition-colors ${className}`}
      {...rest}
    />
  );
}

// --- M3 switch ---
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group relative w-[52px] h-8 rounded-full transition-colors duration-200 disabled:opacity-40 flex items-center"
      style={{
        backgroundColor: checked ? "#44D62C" : "#242B29",
        border: checked ? "none" : "2px solid #6A736E",
      }}
    >
      <span
        className="absolute rounded-full transition-all duration-200 flex items-center justify-center"
        style={{
          width: checked ? 24 : 16,
          height: checked ? 24 : 16,
          left: checked ? 24 : 10,
          backgroundColor: checked ? "#0A1F06" : "#B3BBB6",
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#44D62C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {/* state layer */}
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: checked ? "rgba(68,214,44,0.12)" : "rgba(226,230,227,0.06)" }} />
    </button>
  );
}

// --- M3 chip ---
export function Chip({
  tone = "neutral",
  children,
  pulse,
}: {
  tone?: "success" | "error" | "neutral";
  children: React.ReactNode;
  pulse?: boolean;
}) {
  const tones = {
    success: "bg-primary-container text-on-primary-container",
    error: "bg-error/15 text-error",
    neutral: "bg-surface-high text-on-surface-variant border border-outline-variant",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-sm text-[11px] font-medium tracking-wide ${tones[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone === "success" ? "bg-primary" : tone === "error" ? "bg-error" : "bg-outline"} ${pulse ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}

// --- StatusCard ---
interface StatusCardProps {
  theme: Theme;
  label: string;
  value: string;
  icon: React.ReactNode;
  active: boolean;
  color: "green" | "blue" | "purple" | "orange";
  subtext?: string;
}

export function StatusCard({ label, value, icon, active, color, subtext }: StatusCardProps) {
  const palette = {
    green: { text: "text-primary", bg: "bg-primary-container" },
    blue: { text: "text-sky-400", bg: "bg-sky-400/10" },
    purple: { text: "text-purple-400", bg: "bg-purple-400/10" },
    orange: { text: "text-orange-400", bg: "bg-orange-400/10" },
  };
  const c = active ? palette[color] : { text: "text-on-surface-variant", bg: "bg-surface-highest" };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-md p-4 flex items-center justify-between gap-3 hover:bg-surface-high transition-colors">
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-on-surface-variant mb-1">{label}</p>
        <p className="text-xl font-medium text-on-surface truncate">{value}</p>
        {subtext && <p className="text-[11px] text-on-surface-variant/70 mt-0.5 truncate">{subtext}</p>}
      </div>
      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
    </div>
  );
}

// --- DriverRow ---
interface DriverRowProps {
  theme: Theme;
  name: string;
  status: boolean;
  /** Performs the real install/uninstall and resolves with a message. */
  onAction: (action: string) => Promise<string>;
  isNew?: boolean;
}

export function DriverRow({ theme, name, status, onAction, isNew }: DriverRowProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const act = async (type: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const text = await onAction(type);
      setMessage({ ok: true, text });
    } catch (e) {
      setMessage({ ok: false, text: String(e) });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 8000);
    }
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-md p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${status ? "bg-primary" : "bg-error/80"}`} />
          <span className="text-sm font-medium text-on-surface truncate">{name}</span>
          {isNew && (
            <span className="text-[10px] font-medium bg-purple-400/15 text-purple-300 px-2 py-0.5 rounded-sm tracking-wide">
              NEW
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {loading ? (
            <span className="w-8 h-8 flex items-center justify-center">
              <RefreshCw size={14} className="animate-spin text-on-surface-variant" />
            </span>
          ) : status ? (
            <>
              <Btn small variant="outlined" onClick={() => act("reinstall")}>
                Reinstall
              </Btn>
              <Btn small variant="danger" onClick={() => act("uninstall")}>
                Uninstall
              </Btn>
            </>
          ) : (
            <Btn small variant="filled" theme={theme} onClick={() => act("install")}>
              Install
            </Btn>
          )}
        </div>
      </div>
      {message && (
        <p className={`mt-2 text-xs font-mono break-all ${message.ok ? "text-primary" : "text-error"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

// --- ToggleRow ---
interface ToggleRowProps {
  theme: Theme;
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  small?: boolean;
}

export function ToggleRow({ label, checked, onChange, small }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-on-surface ${small ? "text-sm" : "text-[15px]"} font-normal`}>{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
