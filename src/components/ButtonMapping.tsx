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
              id={key}
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

      {/* Controller photo + hotspots */}
      <div className="w-full xl:w-[560px] shrink-0 h-fit space-y-4">
        <div className="bg-surface-container border border-outline-variant rounded-md p-6 flex items-center justify-center">
          <div className="relative w-full aspect-[1400/1166] max-w-[500px]">
            <img
              src="/controller.png"
              alt="Stadia controller"
              draggable={false}
              className="w-full h-full drop-shadow-xl select-none"
              // The render carries a low-alpha studio haze that would otherwise
              // show as a hard rectangle on the card; fade it to zero at the frame.
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 47%, #000 70%, transparent 100%)",
                maskImage: "radial-gradient(ellipse 50% 50% at 50% 47%, #000 70%, transparent 100%)",
              }}
            />

            {/* Shoulders — sit on the top-edge shoulder arcs */}
            <SBtn id="lTrigger" label="L2" x={26.5} y={21.5} size="shoulder" active={hoveredKey === "lTrigger"} />
            <SBtn id="lBumper" label="L1" x={32.5} y={21.5} size="shoulder" active={hoveredKey === "lBumper"} />
            <SBtn id="rBumper" label="R1" x={67.5} y={21.5} size="shoulder" active={hoveredKey === "rBumper"} />
            <SBtn id="rTrigger" label="R2" x={73.5} y={21.5} size="shoulder" active={hoveredKey === "rTrigger"} />

            {/* D-pad */}
            <SBtn id="dpadUp" label="▲" x={28.8} y={28.8} size="dpad" active={hoveredKey === "dpadUp"} />
            <SBtn id="dpadDown" label="▼" x={28.8} y={34.6} size="dpad" active={hoveredKey === "dpadDown"} />
            <SBtn id="dpadLeft" label="◀" x={24.7} y={31.5} size="dpad" active={hoveredKey === "dpadLeft"} />
            <SBtn id="dpadRight" label="▶" x={33.3} y={31.5} size="dpad" active={hoveredKey === "dpadRight"} />

            {/* Face diamond */}
            <SBtn id="faceY" label="Y" x={71.2} y={26.2} round size="face" active={hoveredKey === "faceY"} />
            <SBtn id="faceX" label="X" x={66.2} y={31.9} round size="face" active={hoveredKey === "faceX"} />
            <SBtn id="faceB" label="B" x={76} y={31.9} round size="face" active={hoveredKey === "faceB"} />
            <SBtn id="faceA" label="A" x={71.5} y={36.9} round size="face" active={hoveredKey === "faceA"} />

            {/* Center cluster */}
            <SBtn id="optionsBtn" label="OPT" x={41} y={25.5} size="pill" active={hoveredKey === "optionsBtn"} />
            <SBtn id="menuBtn" label="MNU" x={58.8} y={25.5} size="pill" active={hoveredKey === "menuBtn"} />
            <SBtn id="stadiaBtn" label="S" x={50} y={43.3} round size="center" active={hoveredKey === "stadiaBtn"} />
            <SBtn id="assistantBtn" label="AST" x={44.5} y={31.9} size="small" active={hoveredKey === "assistantBtn"} />
            <SBtn id="captureBtn" label="CAP" x={55.2} y={31.9} size="small" active={hoveredKey === "captureBtn"} />

            {/* Stick clicks */}
            <SBtn id="lStickClick" label="L3" x={37.7} y={39.6} round size="stick" active={hoveredKey === "lStickClick"} />
            <SBtn id="rStickClick" label="R3" x={62.4} y={39.6} round size="stick" active={hoveredKey === "rStickClick"} />
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
// Positions are % of the controller photo container; sizes are px, so the
// drawing is exact at the container's 500px design width.
const BTN_SIZES = {
  shoulder: "w-[24px] h-4 text-[8px]",
  dpad: "w-[18px] h-[18px] text-[9px]",
  pill: "w-[32px] h-[18px] text-[8px]",
  small: "w-6 h-6 text-[8px]",
  face: "w-7 h-7 text-[10px]",
  stick: "w-9 h-9 text-[10px]",
  center: "w-8 h-8 text-[10px]",
} as const;

function SBtn({
  id, label, x, y, active, round, size = "face",
}: {
  id: string; label: string; x: number; y: number; active: boolean;
  round?: boolean; size?: keyof typeof BTN_SIZES;
}) {
  // Exactly one radius class — rounded-full and rounded-xs can collide in the
  // generated stylesheet depending on key order.
  const radius = size === "shoulder" || size === "pill" || round ? "rounded-full" : "rounded-xs";
  return (
    <div
      className={`absolute flex items-center justify-center font-medium transition-all duration-200 border
        ${active ? "bg-primary text-on-primary border-transparent scale-110 shadow-lg z-20" : "bg-black/70 text-white border-white/50"}
        ${BTN_SIZES[size]} ${radius}
      `}
      data-key={id}
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      {label}
    </div>
  );
}

// --- Mapping Row with Expand ---
function MappingRow({
  id, theme, data, onChange, onHover,
}: {
  id: string; theme: Theme; data: Keybind;
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
      onMouseEnter={() => onHover(id)}
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
