import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Theme, AppConfig } from "../lib/types";
import { Btn, Overline } from "./ui";

interface VibrationProps {
  theme: Theme;
  config: AppConfig;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
}

export default function Vibration({ theme, config, updateConfig }: VibrationProps) {
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const strength = config.vibration.strength;

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const text = await invoke<string>("test_rumble", { strength });
      setMessage({ ok: true, text });
    } catch (e) {
      setMessage({ ok: false, text: String(e) });
    } finally {
      setTesting(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-normal text-on-surface">Vibration</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Test and configure controller force feedback.
        </p>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-md p-6">
        <Overline>Force feedback</Overline>
        <div className="flex items-center gap-5">
          <span className="text-xs text-on-surface-variant font-mono w-8 text-right">0%</span>
          <input
            type="range"
            min={0}
            max={100}
            className="m3-slider flex-1"
            style={{ "--val": `${strength}%` } as React.CSSProperties}
            value={strength}
            onChange={(e) => updateConfig("vibration", "strength", Number(e.target.value))}
            aria-label="Vibration strength"
          />
          <span className="text-xl font-medium text-on-surface font-mono w-14">{strength}%</span>
        </div>

        <div className="mt-4">
          <Btn variant="filled" theme={theme} onClick={handleTest} disabled={testing} className="w-full">
            {testing ? "Testing…" : "Test rumble"}
          </Btn>
        </div>

        <p
          className={`mt-3 text-xs min-h-4 font-mono ${
            message ? (message.ok ? "text-primary" : "text-error") : "text-on-surface-variant"
          }`}
        >
          {message?.text ?? "USB only — Windows cannot vibrate over Bluetooth."}
        </p>
      </div>
    </div>
  );
}
