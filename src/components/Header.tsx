import { useState, useEffect } from "react";
import { Palette, Save } from "lucide-react";
import { Theme, ThemeKey } from "../lib/types";
import { THEMES } from "../lib/themes";

interface HeaderProps {
  theme: Theme;
  themeKey: ThemeKey;
  onThemeChange: (key: ThemeKey) => void;
  onSave: () => void;
}

export default function Header({ theme, themeKey, onThemeChange, onSave }: HeaderProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [time, setTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-gray-500">STADIA VIGEM MANAGER</span>
        <span className="text-[10px] text-gray-600 font-mono">v2.1.0</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-xs font-bold text-white font-mono">
            {time.toLocaleTimeString()}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {time.toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2 relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 hover:bg-white/10 rounded text-gray-400 transition-colors"
          >
            <Palette size={16} />
          </button>
          {showThemeMenu && (
            <div className="absolute top-10 right-16 bg-[#1a1a1a] border border-white/10 rounded-lg p-2 z-50 shadow-xl">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <div
                  key={k}
                  onClick={() => {
                    onThemeChange(k);
                    setShowThemeMenu(false);
                  }}
                  className={`w-6 h-6 rounded-full mb-1 cursor-pointer transition-transform hover:scale-125 ${THEMES[k].primary} ${k === themeKey ? "ring-2 ring-white" : ""}`}
                  title={THEMES[k].name}
                />
              ))}
            </div>
          )}
          <button
            onClick={onSave}
            className={`flex items-center gap-2 ${theme.primary} text-white px-4 py-1.5 rounded text-xs font-bold hover:opacity-90 transition-opacity`}
          >
            <Save size={14} /> SAVE CONFIG
          </button>
        </div>
      </div>
    </header>
  );
}
