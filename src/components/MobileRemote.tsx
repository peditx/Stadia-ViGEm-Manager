import { useState } from "react";
import { Smartphone, Wifi, AlertTriangle, Copy, Check } from "lucide-react";
import { Theme, AppConfig, ControllerStatus } from "../lib/types";
import { ToggleRow, Chip, Btn, Overline } from "./ui";

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-normal text-on-surface flex items-center gap-3">
            <Smartphone size={24} className="text-primary" /> Remote access
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Open the address on any phone on the same network to check status and trigger rumble.
          </p>
        </div>
        <Chip tone={running ? "success" : "neutral"} pulse={running && toggling}>
          {running ? "Running" : "Stopped"}
        </Chip>
      </div>

      {!config.mobile.enabled ? (
        <div className="bg-surface-container border border-outline-variant rounded-md p-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-error/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-error" />
          </div>
          <h3 className="text-lg font-medium text-on-surface mb-1">Service not enabled</h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md">
            Enable remote access to start the Mobile Bridge service.
          </p>
          <div className="w-full max-w-sm bg-surface-high border border-outline-variant rounded-md p-4">
            <ToggleRow
              theme={theme}
              label={toggling ? "Working…" : "Enable remote access"}
              checked={config.mobile.enabled}
              onChange={(v) => void setEnabled(v)}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container border border-outline-variant rounded-md p-5 space-y-5">
            <Overline>Server</Overline>
            <ToggleRow
              theme={theme}
              label={toggling ? "Working…" : "Enable remote access"}
              checked={config.mobile.enabled}
              onChange={(v) => void setEnabled(v)}
            />
            <div>
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-on-surface-variant mb-1.5 block">
                Local IP
              </label>
              <div className="flex items-center gap-2 bg-surface border border-outline rounded-xs px-3 h-10">
                <Wifi size={14} className="text-primary" />
                <span className="text-sm font-mono text-on-surface">{status.localIp}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-on-surface-variant mb-1.5 block">
                Port
              </label>
              <input
                type="number"
                value={config.mobile.port}
                onChange={(e) => updateConfig("mobile", "port", parseInt(e.target.value) || 9090)}
                className="w-full bg-surface border border-outline rounded-xs px-3 h-10 text-sm text-on-surface font-mono outline-none focus:border-2 focus:border-primary"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Port changes apply after Save config.
              </p>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-md p-5 flex flex-col gap-4">
            <Overline>Open on your phone</Overline>
            <button
              onClick={copy}
              className="w-full bg-surface border border-outline rounded-xs p-3 font-mono text-sm break-all text-on-surface hover:bg-surface-high transition-colors"
            >
              {url}
            </button>
            <Btn variant="tonal" onClick={copy}>
              {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy address"}
            </Btn>
            <p className="text-xs text-on-surface-variant">
              Same Wi-Fi network only. The page shows connection status and a rumble button — no QR
              generator is bundled.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
