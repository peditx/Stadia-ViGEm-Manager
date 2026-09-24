import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Theme, AppConfig } from "../lib/types";

interface VibrationProps {
  theme: Theme;
  config: AppConfig;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
}

export default function Vibration({ theme, config, updateConfig }: VibrationProps) {
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const text = await invoke<string>("test_rumble", {
        strength: config.vibration.strength,
      });
      setMessage({ ok: true, text });
    } catch (e) {
      setMessage({ ok: false, text: String(e) });
    } finally {
      setTesting(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#1a1a1a] p-8 rounded-lg border border-white/5 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Force Feedback</h2>
        <p className="text-gray-500 text-sm mb-6">Test and configure controller vibration</p>
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="text-xs text-gray-500">0%</span>
          <input
            type="range"
            min={0}
            max={100}
            className="w-64 h-2 bg-black rounded-lg appearance-none cursor-pointer accent-blue-500"
            value={config.vibration.strength}
            onChange={(e) =>
              updateConfig("vibration", "strength", Number(e.target.value))
            }
          />
          <span className="text-xs text-white font-mono">
            {config.vibration.strength}%
          </span>
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          className={`w-full py-3 rounded font-bold transition-all ${
            testing
              ? "bg-white/10 text-gray-500"
              : `${theme.primary} text-white hover:opacity-90`
          }`}
        >
          {testing ? "TESTING..." : "TEST RUMBLE"}
        </button>
        <p
          className={`mt-3 text-xs font-mono min-h-4 ${
            message ? (message.ok ? "text-green-400" : "text-red-400") : "text-gray-600"
          }`}
        >
          {message?.text ?? "USB only — Windows cannot vibrate over Bluetooth."}
        </p>
      </div>
    </div>
  );
}
