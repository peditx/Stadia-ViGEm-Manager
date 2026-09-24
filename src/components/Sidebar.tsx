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
    <aside className="w-60 bg-[#0a0a0a] border-r border-white/10 flex flex-col justify-between shrink-0">
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-white/5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${theme.gradient} text-white font-black text-sm`}
          >
            SX
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">SX MANAGER</h1>
            <span className="text-[10px] text-gray-500 block">v2.1.0 (Stable)</span>
          </div>
        </div>
        <nav className="p-2 space-y-1 mt-1">
          {items.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === key
                  ? `${theme.accentBg} ${theme.text} border border-white/10`
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-4 bg-[#050505] border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-500/60" />
          <span className="text-[10px] font-mono text-gray-400">WINDOWS · X64</span>
        </div>
        <div className="text-[10px] text-gray-600 truncate" title={configPath}>
          Config: {configPath}
        </div>
      </div>
    </aside>
  );
}
