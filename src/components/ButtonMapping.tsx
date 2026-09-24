import { useState, useEffect, useRef } from "react";
import { Gamepad2, Keyboard, Play, FolderOpen } from "lucide-react";
import { Theme, AppConfig, Keybind } from "../lib/types";
import { Overline, IconBtn } from "./ui";

interface ButtonMappingProps {
  theme: Theme;
  config: AppConfig;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
}

export default function ButtonMapping({ theme, config, updateConfig }: ButtonMappingProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full overflow-hidden">
      {/* Keybind List */}
      <div className="flex-1 bg-surface-container border border-outline-variant rounded-md flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-outline-variant">
          <Overline>Button map</Overline>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {Object.entries(config.keybinds).map(([key, val]) => (
            <MappingRow
              key={key}
              theme={theme}
              data={val}
              onChange={(field, value) => {
                const newKeybinds = { ...config.keybinds, [key]: { ...val, [field]: value } };
                updateConfig(null, "keybinds", newKeybinds);
              }}
              onHover={setHoveredKey}
            />
          ))}
        </div>
      </div>

      {/* SVG Controller Schematic */}
      <div className="w-full xl:w-[560px] shrink-0 h-fit space-y-4">
        <div className="bg-surface-container border border-outline-variant rounded-md p-6 flex items-center justify-center">
          <div className="relative w-full aspect-[500/340] max-w-[500px]">
            <svg viewBox="0 0 500 340" className="w-full h-full drop-shadow-xl">
              <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e5e7eb" />
                  <stop offset="100%" stopColor="#c3c9c6" />
                </linearGradient>
              </defs>
              <path
                d="M 140 60 L 360 60 Q 440 60 440 140 L 440 220 Q 440 280 390 280 L 350 280 Q 310 280 310 240 L 310 220 Q 310 200 250 200 Q 190 200 190 220 L 190 240 Q 190 280 150 280 L 110 280 Q 60 280 60 220 L 60 140 Q 60 60 140 60 Z"
                fill="url(#bodyGrad)"
                stroke="#9aa39e"
                strokeWidth="1.5"
              />
            </svg>

            {/* Buttons */}
            <SBtn label="L2" x={15} y={5} active={hoveredKey === "lTrigger"} />
            <SBtn label="R2" x={85} y={5} active={hoveredKey === "rTrigger"} />
            <SBtn label="L1" x={20} y={12} active={hoveredKey === "lBumper"} small darkText />
            <SBtn label="R1" x={80} y={12} active={hoveredKey === "rBumper"} small darkText />
            <SBtn label="Y" x={75} y={28} active={hoveredKey === "faceY"} round darkText />
            <SBtn label="X" x={69} y={35} active={hoveredKey === "faceX"} round darkText />
            <SBtn label="B" x={81} y={35} active={hoveredKey === "faceB"} round darkText />
            <SBtn label="A" x={75} y={42} active={hoveredKey === "faceA"} round darkText />
            <SBtn label="UP" x={25} y={28} active={hoveredKey === "dpadUp"} small />
            <SBtn label="DWN" x={25} y={42} active={hoveredKey === "dpadDown"} small />
            <SBtn label="LFT" x={19} y={35} active={hoveredKey === "dpadLeft"} small />
            <SBtn label="RGT" x={31} y={35} active={hoveredKey === "dpadRight"} small />
            <SBtn label="S" x={50} y={40} active={hoveredKey === "stadiaBtn"} round large />
            <SBtn label="OPT" x={38} y={28} active={hoveredKey === "optionsBtn"} small darkText />
            <SBtn label="MENU" x={62} y={28} active={hoveredKey === "menuBtn"} small darkText />
            <SBtn label="AST" x={42} y={50} active={hoveredKey === "assistantBtn"} small darkText />
            <SBtn label="CAP" x={58} y={50} active={hoveredKey === "captureBtn"} small darkText />
            <SBtn label="L3" x={36} y={62} active={hoveredKey === "lStickClick"} round large />
            <SBtn label="R3" x={64} y={62} active={hoveredKey === "rStickClick"} round large />
          </div>
        </div>

        {/* Deadzones */}
        <div className="bg-surface-container border border-outline-variant rounded-md p-4">
          <div className="mb-1">
            <Overline>Deadzones</Overline>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 bg-surface rounded-full border border-outline-variant flex items-center justify-center">
                <div
                  className={`absolute rounded-full border ${theme.border}`}
                  style={{
                    width: `${config.deadzones.left * 2}%`,
                    height: `${config.deadzones.left * 2}%`,
                    backgroundColor: `${theme.hex}30`,
                  }}
                />
                <div className="w-1 h-1 bg-white rounded-full z-10" />
              </div>
              <span className="text-xs text-on-surface-variant mt-2">
                Left · {config.deadzones.left}%
              </span>
              <input
                type="range"
                max="50"
                value={config.deadzones.left}
                onChange={(e) => updateConfig("deadzones", "left", Number(e.target.value))}
                className="m3-slider w-full"
                style={{ "--val": `${(config.deadzones.left / 50) * 100}%` } as React.CSSProperties}
                aria-label="Left stick deadzone"
              />
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 bg-surface rounded-full border border-outline-variant flex items-center justify-center">
                <div
                  className={`absolute rounded-full border ${theme.border}`}
                  style={{
                    width: `${config.deadzones.right * 2}%`,
                    height: `${config.deadzones.right * 2}%`,
                    backgroundColor: `${theme.hex}30`,
                  }}
                />
                <div className="w-1 h-1 bg-white rounded-full z-10" />
              </div>
              <span className="text-xs text-on-surface-variant mt-2">
                Right · {config.deadzones.right}%
              </span>
              <input
                type="range"
                max="50"
                value={config.deadzones.right}
                onChange={(e) => updateConfig("deadzones", "right", Number(e.target.value))}
                className="m3-slider w-full"
                style={{ "--val": `${(config.deadzones.right / 50) * 100}%` } as React.CSSProperties}
                aria-label="Right stick deadzone"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Schematic Button ---
function SBtn({
  label, x, y, active, round, small, large, darkText,
}: {
  label: string; x: number; y: number; active: boolean;
  round?: boolean; small?: boolean; large?: boolean; darkText?: boolean;
}) {
  return (
    <div
      className={`absolute flex items-center justify-center font-medium transition-all duration-200 border
        ${active ? "bg-primary text-on-primary border-transparent scale-110 shadow-lg z-20" : `bg-white border-gray-300 ${darkText ? "text-gray-500" : "text-gray-400"}`}
        ${round ? "rounded-full" : "rounded-xs"}
        ${large ? "w-10 h-10 text-xs" : small ? "w-7 h-7 text-[9px]" : "w-8 h-8 text-[10px]"}
      `}
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      {label}
    </div>
  );
}

// --- Mapping Row with Expand ---
function MappingRow({
  theme, data, onChange, onHover,
}: {
  theme: Theme; data: Keybind;
  onChange: (field: string, value: string) => void;
  onHover: (key: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [recording, setRecording] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const keys: string[] = [];
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.shiftKey) keys.push("Shift");
      if (e.altKey) keys.push("Alt");
      if (["Control", "Shift", "Alt"].includes(e.key)) return;
      keys.push(e.key.toUpperCase());
      onChange("value", keys.join("+"));
      setRecording(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [recording, onChange]);

  const getIcon = () => {
    if (data.mode === "app") return <Play size={12} className="text-primary" />;
    if (data.mode === "shortcut") return <Keyboard size={12} className="text-purple-400" />;
    return <Gamepad2 size={12} className={theme.text} />;
  };

  return (
    <div
      className={`rounded-sm transition-all border ${
        expanded ? "border-primary/50 bg-surface-high" : "border-transparent hover:bg-surface-high"
      }`}
      onMouseEnter={() => onHover(data.label)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className="px-3 py-2.5 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm text-on-surface w-28 font-normal">{data.label}</span>
        <div className="flex items-center gap-2 bg-surface border border-outline-variant px-2.5 h-7 rounded-xs">
          {getIcon()}
          <span className="text-xs text-on-surface font-mono truncate max-w-[110px]">{data.value}</span>
        </div>
      </div>
      {expanded && (
        <div className="p-3 pt-1 border-t border-outline-variant space-y-3">
          {/* M3 segmented buttons */}
          <div className="flex rounded-xs overflow-hidden border border-outline h-8">
            {(["xinput", "app", "shortcut"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onChange("mode", m)}
                className={`flex-1 text-[11px] uppercase tracking-wide font-medium transition-colors ${
                  data.mode === m ? "" : "text-on-surface-variant hover:bg-white/5"
                }`}
                style={
                  data.mode === m
                    ? { backgroundColor: "rgba(68,214,44,0.16)", color: "#B9F5A6" }
                    : undefined
                }
              >
                {m}
              </button>
            ))}
          </div>
          {data.mode === "xinput" && (
            <select
              value={data.value}
              onChange={(e) => onChange("value", e.target.value)}
              className="w-full bg-surface border border-outline rounded-xs px-3 h-9 text-sm text-on-surface outline-none focus:border-2 focus:border-primary appearance-none"
            >
              <optgroup label="Standard Xbox">
                {["A", "B", "X", "Y", "Start", "Back", "Guide", "LB", "RB", "LT", "RT", "L-Stick", "R-Stick", "Up", "Down", "Left", "Right"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
            </select>
          )}
          {data.mode === "app" && (
            <div className="flex gap-2">
              {/* ponytail: no tauri-plugin-dialog yet — file picker yields name only,
                  so the path stays hand-editable for full paths like C:\Games\x.exe */}
              <input
                type="text"
                value={data.value}
                onChange={(e) => onChange("value", e.target.value)}
                placeholder="full path to .exe"
                className="flex-1 min-w-0 bg-surface border border-outline rounded-xs px-3 h-9 text-sm text-on-surface outline-none focus:border-2 focus:border-primary"
              />
              <input type="file" ref={ref} className="hidden" onChange={(e) => e.target.files?.[0] && onChange("value", e.target.files[0].name)} />
              <IconBtn onClick={() => ref.current?.click()} className="!border !border-outline !rounded-xs !h-9 !w-9">
                <FolderOpen size={14} />
              </IconBtn>
            </div>
          )}
          {data.mode === "shortcut" && (
            <button
              onClick={() => setRecording(!recording)}
              className={`w-full h-9 rounded-full text-sm font-medium transition-colors ${
                recording
                  ? "bg-error text-black animate-pulse"
                  : "bg-surface-high text-on-surface hover:bg-surface-highest"
              }`}
            >
              {recording ? "Press keys…" : "Record shortcut"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
