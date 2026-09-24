import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Theme } from "../lib/types";

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

export function StatusCard({ theme, label, value, icon, active, color, subtext }: StatusCardProps) {
  const colorMap = {
    green: { text: "text-green-400", bg: "bg-green-500/10" },
    blue: { text: "text-blue-400", bg: "bg-blue-500/10" },
    purple: { text: "text-purple-400", bg: "bg-purple-500/10" },
    orange: { text: "text-orange-400", bg: "bg-orange-500/10" },
  };
  const c = active ? colorMap[color] : { text: "text-gray-400", bg: "bg-gray-500/10" };

  return (
    <div className="bg-[#15171c] p-4 rounded-xl border border-white/5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        {subtext && <p className="text-[9px] text-gray-500 mt-0.5">{subtext}</p>}
      </div>
      <div className={`p-2 rounded-lg ${c.bg} ${c.text}`}>{icon}</div>
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
    <div className="bg-[#15171c] p-4 rounded-xl border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`} />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{name}</span>
            {isNew && (
              <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 rounded font-bold">
                NEW
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {loading ? (
            <RefreshCw size={14} className="animate-spin text-gray-500" />
          ) : status ? (
            <>
              <button
                onClick={() => act("reinstall")}
                className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                Reinstall
              </button>
              <button
                onClick={() => act("uninstall")}
                className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Uninstall
              </button>
            </>
          ) : (
            <button
              onClick={() => act("install")}
              className="text-[10px] bg-green-500/10 text-green-400 px-3 py-1 rounded border border-green-500/20 hover:bg-green-500/20 transition-colors"
            >
              Install
            </button>
          )}
        </div>
      </div>
      {message && (
        <p
          className={`mt-2 text-[10px] font-mono break-all ${
            message.ok ? "text-green-400" : "text-red-400"
          }`}
        >
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

export function ToggleRow({ theme, label, checked, onChange, small }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-gray-300 font-medium ${small ? "text-xs" : "text-sm"}`}>
        {label}
      </span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
          checked ? theme.primary : "bg-gray-700"
        }`}
      >
        <div
          className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${
            checked ? "left-5" : "left-1"
          }`}
        />
      </div>
    </div>
  );
}
