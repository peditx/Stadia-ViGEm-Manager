import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Smartphone, Wifi, AlertTriangle, Copy, Check } from "lucide-react";
import { Theme, AppConfig, ControllerStatus } from "../lib/types";
import { ToggleRow } from "./ui";

interface MobileRemoteProps {
  theme: Theme;
  config: AppConfig;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
  status: ControllerStatus;
  onDriverAction: (name: string, action: string) => Promise<string>;
}

export default function MobileRemote({
  theme,
  config,
  updateConfig,
  status,
  onDriverAction,
}: MobileRemoteProps) {
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `http://${status.localIp}:${config.mobile.port}`;
  const running = status.mobileService;

  const setEnabled = async (v: boolean) => {
    updateConfig("mobile", "enabled", v);
    setToggling(true);
    try {
      await onDriverAction("mobileService", v ? "install" : "uninstall");
    } catch {
      /* status poll will show the real state */
    } finally {
      setToggling(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className={`bg-gradient-to-r ${theme.gradient} rounded-2xl p-8 relative overflow-hidden shadow-2xl`}>
          <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-[80px]" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Smartphone size={24} /> Mobile Remote Control
              </h2>
              <p className="text-white/80 text-sm max-w-lg">
                Open the address below on any phone on the same network to check
                status and trigger rumble.
              </p>
            </div>
            <div className="hidden md:block">
              <Wifi size={64} className="text-white/20" />
            </div>
          </div>
        </div>

        {!config.mobile.enabled ? (
          <div className="bg-[#15171c] border border-red-500/20 rounded-xl p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Service Not Enabled</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Enable Remote Access below to start the Mobile Bridge Service.
            </p>
            <div className="w-full max-w-sm bg-black/30 border border-white/5 rounded-lg p-4">
              <ToggleRow
                theme={theme}
                label={toggling ? "Working..." : "Enable Remote Access"}
                checked={config.mobile.enabled}
                onChange={(v) => void setEnabled(v)}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#15171c] p-6 rounded-xl border border-white/5 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <h3 className="font-bold text-white">Server Config</h3>
                <div
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    running
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {running ? "RUNNING" : "STOPPED"}
                </div>
              </div>
              <ToggleRow
                theme={theme}
                label={toggling ? "Working..." : "Enable Remote Access"}
                checked={config.mobile.enabled}
                onChange={(v) => void setEnabled(v)}
              />
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-bold">LOCAL IP</label>
                <div className="flex items-center justify-between bg-[#0b0c10] border border-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Wifi size={14} className={theme.text} />
                    <span className="text-sm font-mono text-white">{status.localIp}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-bold">PORT</label>
                <input
                  type="number"
                  value={config.mobile.port}
                  onChange={(e) => updateConfig("mobile", "port", parseInt(e.target.value) || 9090)}
                  className={`w-full bg-[#0b0c10] border border-white/10 rounded-lg p-3 text-sm text-white font-mono outline-none ${theme.ring}`}
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  Port changes apply after Save Config.
                </p>
              </div>
            </div>
            <div className="bg-[#15171c] p-6 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
              <h3 className="font-bold text-white text-sm">Open On Your Phone</h3>
              <button
                onClick={copy}
                className="w-full bg-[#0b0c10] border border-white/10 hover:border-white/25 rounded-lg p-4 font-mono text-sm break-all"
              >
                <span className={theme.text}>{url}</span>
              </button>
              <button
                onClick={copy}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy address"}
              </button>
              <p className="text-[11px] text-gray-600 max-w-xs">
                Same Wi-Fi network only. The page shows connection status and a
                rumble button — no QR generator is bundled.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
