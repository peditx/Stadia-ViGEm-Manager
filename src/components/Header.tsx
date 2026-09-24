import { useState, useEffect } from "react";
import { Palette, Save } from "lucide-react";
import { Theme, ThemeKey, ControllerStatus } from "../lib/types";
import { THEMES } from "../lib/themes";
import { Btn, Chip, IconBtn } from "./ui";

interface HeaderProps {
  theme: Theme;
  themeKey: ThemeKey;
  onThemeChange: (key: ThemeKey) => void;
  onSave: () => void;
  status: ControllerStatus;
}

export default function Header({ theme, themeKey, onThemeChange, onSave, status }: HeaderProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [time, setTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const padChip =
    status.controller === "connected" ? (
      <Chip tone="success">Controller · {status.connection}</Chip>
    ) : status.controller === "searching" ? (
      <Chip tone="neutral" pulse>Searching…</Chip>
    ) : (
      <Chip tone="error">No controller</Chip>
    );

  return (
    <header className="h-14 border-b border-outline-variant flex items-center justify-between px-8 bg-surface-low shrink-0">
      <div className="flex items-center gap-2">
        {padChip}
        <Chip tone={status.vigemBus ? "success" : "neutral"}>{status.vigemBus ? "ViGEmBus" : "No bus"}</Chip>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end mr-1">
          <span className="text-xs font-medium text-on-surface font-mono">
            {time.toLocaleTimeString()}
          </span>
          <span className="text-[10px] text-on-surface-variant font-mono">
            {time.toLocaleDateString()}
          </span>
        </div>
        <div className="relative">
          <IconBtn onClick={() => setShowThemeMenu(!showThemeMenu)} aria-label="Accent color">
            <Palette size={18} />
          </IconBtn>
          {showThemeMenu && (
            <div className="absolute top-11 right-0 bg-surface-high border border-outline-variant rounded-md p-3 z-50 shadow-2xl flex gap-2">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    onThemeChange(k);
                    setShowThemeMenu(false);
                  }}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${THEMES[k].primary} ${
                    k === themeKey ? "ring-2 ring-on-surface offset-2" : ""
                  }`}
                  title={THEMES[k].name}
                />
              ))}
            </div>
          )}
        </div>
        <Btn variant="filled" theme={theme} onClick={onSave} className="!h-10">
          <Save size={16} /> Save config
        </Btn>
      </div>
    </header>
  );
}
