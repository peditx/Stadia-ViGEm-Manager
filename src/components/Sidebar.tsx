import {
  Activity,
  List,
  FileCode,
  Zap,
  Smartphone,
} from "lucide-react";
import { Theme } from "../lib/types";

interface SidebarProps {
  theme: Theme;
  activeTab: string;
  onTabChange: (tab: string) => void;
  configPath: string;
}

const items = [
  { key: "dashboard", icon: Activity, label: "System Status" },
  { key: "mapping", icon: List, label: "Button Mapping" },
  { key: "macros", icon: FileCode, label: "Macros" },
  { key: "vibration", icon: Zap, label: "Vibration" },
  { key: "mobile", icon: Smartphone, label: "Remote Access" },
];

export default function Sidebar({ theme, activeTab, onTabChange, configPath }: SidebarProps) {
  return (
    <aside className="w-60 bg-surface-low border-r border-outline-variant flex flex-col justify-between shrink-0">
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-outline-variant">
          <img src="/mark.png" alt="" className="w-9 h-9 rounded-sm shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-on-surface leading-tight">Stadia Manager</h1>
            <span className="text-[11px] text-on-surface-variant block">v2.1.0</span>
          </div>
        </div>
        <nav className="p-2 space-y-1 mt-1">
          {items.map(({ key, icon: Icon, label }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                aria-current={active ? "page" : undefined}
                className={`w-full flex items-center gap-3 h-10 px-3 rounded-full text-sm font-medium transition-all duration-150 ${
                  active
                    ? "text-on-primary-container"
                    : "text-on-surface-variant hover:bg-white/[0.06] hover:text-on-surface"
                }`}
                style={active ? { backgroundColor: "rgba(68,214,44,0.14)", color: theme.hex === "#44D62C" ? "#B9F5A6" : theme.hex } : undefined}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} /> {label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-outline-variant space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[11px] font-medium tracking-[0.08em] text-on-surface-variant">WINDOWS · X64</span>
        </div>
        <div className="text-[10px] text-on-surface-variant/60 font-mono truncate" title={configPath}>
          {configPath}
        </div>
      </div>
    </aside>
  );
}
