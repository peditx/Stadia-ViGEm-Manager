import { useState, useEffect } from "react";
import { Smartphone, Wifi, AlertTriangle, Copy, Check, QrCode, RefreshCw } from "lucide-react";
import { Theme, AppConfig, ControllerStatus } from "../lib/types";
import { ToggleRow, Chip, Btn, Overline, IconBtn } from "./ui";

interface MobileRemoteProps {
  theme: Theme;
  config: AppConfig;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
  status: ControllerStatus;
}

export default function MobileRemote({
  theme,
  config,
  updateConfig,
  status,
}: MobileRemoteProps) {
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const running = status.mobileService;

  const url = `http://${status.localIp}:${config.mobile.port}`;
  const fullUrl = token ? `${url}/#${token}` : url;

  // Fetch token when service starts
  useEffect(() => {
    if (running && config.mobile.token) {
      setToken(config.mobile.token);
    } else if (!running) {
      setToken(null);
    }
  }, [running, config.mobile.token]);

  const setEnabled = async (v: boolean) => {
    updateConfig("mobile", "enabled", v);
    setToggling(true);
    // apply_live will start/stop the server; this just sets the flag
    setTimeout(() => setToggling(false), 500);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const copyToken = async () => {
    if (token) {
      try {
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {}
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-normal text-on-surface flex items-center gap-3">
            <Smartphone size={24} className="text-primary" /> Remote access
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Open the address on any phone on the same network to control the app — rumble, macros, drivers.
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
                Port changes apply automatically.
              </p>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-md p-5 flex flex-col gap-4">
            <Overline>Open on your phone</Overline>
            {token ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-on-surface-variant mb-1.5 block">
                      Address (includes token)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={copy}
                        className="flex-1 bg-surface border border-outline rounded-xs p-3 font-mono text-sm break-all text-on-surface hover:bg-surface-high transition-colors"
                      >
                        {fullUrl}
                      </button>
                      <IconBtn onClick={copy} className="!border !border-outline !rounded-xs !h-10 !w-10" title="Copy address">
                        {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                      </IconBtn>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-on-surface-variant mb-1.5 block">
                      Token (keep secret)
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-surface border border-outline rounded-xs px-3 py-3 font-mono text-sm break-all text-on-surface-variant">
                        {token}
                      </div>
                      <IconBtn onClick={copyToken} className="!border !border-outline !rounded-xs !h-10 !w-10" title="Copy token">
                        {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                      </IconBtn>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Same Wi-Fi network only. The token is regenerated each time the service starts.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">Starting service…</p>
                <button
                  onClick={() => void updateConfig("mobile", "enabled", false)}
                  className="w-full bg-surface-high border border-outline rounded-xs py-2 text-sm text-on-surface hover:bg-surface-highest transition-colors"
                >
                  <RefreshCw size={14} className="animate-spin inline mr-2" /> Restart service
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
