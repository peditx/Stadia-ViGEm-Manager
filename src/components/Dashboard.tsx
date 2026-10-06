import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Gamepad2,
  BatteryCharging,
  BatteryWarning,
  Bluetooth,
  Cpu,
  Globe,
  Github,
  FolderOpen,
  RefreshCw,
  Download,
} from "lucide-react";
import { Theme, AppConfig, ControllerStatus } from "../lib/types";
import { StatusCard, DriverRow, ToggleRow, Overline, Btn, IconBtn, showToast } from "./ui";

interface DashboardProps {
  theme: Theme;
  config: AppConfig;
  status: ControllerStatus;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
  onRefresh: () => void | Promise<void>;
  onDriverAction: (name: string, action: string) => Promise<string>;
  configPath: string;
  appVersion: string;
}

const RELEASES_JSON =
  "https://api.github.com/repos/peditx/Stadia-ViGEm-Manager/releases/latest";
const RELEASES_PAGE =
  "https://github.com/peditx/Stadia-ViGEm-Manager/releases/latest";

/** `v2.1.0` / `2.1.0` → [2,1,0]; anything untagged (our old `build-<sha>` tags) → null. */
function parseVer(s: string): number[] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(s.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function isNewer(candidate: string, installed: string): boolean {
  const a = parseVer(candidate);
  const b = parseVer(installed);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

type UpdateState =
  | { k: "idle" }
  | { k: "checking" }
  | { k: "latest" }
  | { k: "legacy"; tag: string }
  | { k: "ready"; tag: string; url: string }
  | { k: "error"; msg: string };

export default function Dashboard({
  theme,
  config,
  status,
  updateConfig,
  onRefresh,
  onDriverAction,
  configPath,
  appVersion,
}: DashboardProps) {
  const [update, setUpdate] = useState<UpdateState>({ k: "idle" });
  const [installing, setInstalling] = useState(false);

  // The webview does the GitHub call — no HTTP crate in the Rust side, and the
  // release list is public. Only the download/install goes through the backend.
  const checkForUpdate = async () => {
    setUpdate({ k: "checking" });
    try {
      const res = await fetch(RELEASES_JSON, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const rel = await res.json();
      const tag: string = rel.tag_name || "";
      if (!parseVer(tag)) {
        // Pre-semver release (build-<sha>): can't rank it, just point at it.
        setUpdate({ k: "legacy", tag });
        return;
      }
      if (!isNewer(tag, appVersion)) {
        setUpdate({ k: "latest" });
        return;
      }
      const asset = (rel.assets || []).find((a: { name?: string; browser_download_url?: string }) =>
        /-setup\.exe$/i.test(a.name || ""),
      );
      if (!asset?.browser_download_url) {
        setUpdate({ k: "legacy", tag });
        return;
      }
      setUpdate({ k: "ready", tag, url: asset.browser_download_url });
    } catch (e) {
      setUpdate({ k: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  };

  const installUpdate = async () => {
    if (update.k !== "ready") return;
    setInstalling(true);
    try {
      showToast(await invoke<string>("install_update", { url: update.url }), "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setInstalling(false);
    }
  };

  const connected = status.controller === "connected";
  const hasBattery = status.battery >= 0;
  // USB = mains-powered. BT with no reading = unknown. Never fabricate "AC".
  const battery = hasBattery
    ? `${status.battery}%`
    : connected && status.connection === "USB"
      ? "AC (mains)"
      : connected
        ? "Unknown"
        : "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header (typographic, Material display) */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-normal text-on-surface">Dashboard</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Drivers, device status, and system settings in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outlined" onClick={() => window.open("https://peditx.ir", "_blank")}>
            <Globe size={14} /> PeDitX.ir
          </Btn>
          <Btn variant="tonal" onClick={() => window.open("https://github.com/peditx/Stadia-ViGEm-Manager", "_blank")}>
            <Github size={14} /> GitHub
          </Btn>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          theme={theme}
          label="Controller"
          value={
            status.controller === "searching"
              ? "Searching"
              : connected
                ? `Connected (${status.deviceCount})`
                : "Disconnected"
          }
          icon={<Gamepad2 size={20} />}
          active={connected}
          color="green"
          subtext={
            connected ? "Ready for gaming" : "Connect via USB or Bluetooth"
          }
        />
        <StatusCard
          theme={theme}
          label="Power"
          value={battery}
          icon={
            connected && !hasBattery ? (
              <BatteryWarning size={20} />
            ) : (
              <BatteryCharging size={20} />
            )
          }
          active={connected}
          color="blue"
          subtext={
            !connected
              ? undefined
              : hasBattery
                ? "Controller charge"
                : "Not reported by this controller"
          }
        />
        <StatusCard
          theme={theme}
          label="Connection"
          value={status.connection}
          icon={<Bluetooth size={20} />}
          active={status.connection !== "None"}
          color="purple"
        />
        <StatusCard
          theme={theme}
          label="Driver Engine"
          value={status.driverCore ? "Active" : "Inactive"}
          icon={<Cpu size={20} />}
          active={status.driverCore}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Driver Management */}
        <div className="space-y-3">
          <Overline
            action={
              <IconBtn onClick={() => void onRefresh()} aria-label="Refresh status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </IconBtn>
            }
          >
            Driver Management
          </Overline>
          <DriverRow
            theme={theme}
            name="ViGEmBus Driver"
            status={status.vigemBus}
            onAction={(a) => onDriverAction("vigemBus", a)}
          />
          <DriverRow
            theme={theme}
            name="HidHide Driver"
            status={status.hidHide}
            onAction={(a) => onDriverAction("hidHide", a)}
          />
          <DriverRow
            theme={theme}
            name="Stadia Core"
            status={status.driverCore}
            onAction={(a) => onDriverAction("driverCore", a)}
          />
          <DriverRow
            theme={theme}
            name="Mobile Bridge"
            status={status.mobileService}
            onAction={(a) => onDriverAction("mobileService", a)}
            isNew
          />
        </div>

        {/* System Settings */}
        <div className="space-y-3">
          <Overline>System Settings</Overline>
          <div className="bg-surface-container border border-outline-variant rounded-md p-5 space-y-5">
            <ToggleRow
              theme={theme}
              label="Auto-start with Windows"
              checked={config.system.runOnStartup}
              onChange={(v) => updateConfig("system", "runOnStartup", v)}
            />
            <div>
              <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-on-surface-variant mb-1.5 block">
                Config location
              </label>
              <div className="flex gap-2">
                <div
                  className="flex-1 min-w-0 bg-surface border border-outline rounded-xs px-3 py-2.5 text-xs font-mono text-on-surface truncate h-10"
                  title={configPath}
                >
                  {configPath}
                </div>
                <IconBtn
                  onClick={() => invoke("open_config_dir").catch(() => {})}
                  title="Open config folder"
                  className="!border !border-outline !rounded-xs !h-10 !w-10"
                >
                  <FolderOpen size={16} />
                </IconBtn>
              </div>
            </div>
            <div className="pt-3 border-t border-outline-variant grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-on-surface-variant text-[11px] uppercase tracking-wide">Local IP</span>
                <p className="font-mono text-on-surface">{status.localIp}</p>
              </div>
              <div>
                <span className="text-on-surface-variant text-[11px] uppercase tracking-wide">Devices</span>
                <p className="font-mono text-on-surface">{status.deviceCount}</p>
              </div>
            </div>

            {/* Updates: check GitHub's latest release, then pull the installer down. */}
            <div className="pt-3 border-t border-outline-variant">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-on-surface-variant text-[11px] uppercase tracking-wide">Application</span>
                  <p className="font-mono text-on-surface">v{appVersion}</p>
                </div>
                <Btn
                  variant="outlined"
                  onClick={() => void checkForUpdate()}
                  disabled={update.k === "checking"}
                >
                  <RefreshCw size={14} className={update.k === "checking" ? "animate-spin" : ""} />
                  {update.k === "checking" ? "Checking…" : "Check for updates"}
                </Btn>
              </div>
              <div className="mt-2 min-h-[18px] text-[11px] flex items-center justify-between gap-3">
                <span className="text-on-surface-variant truncate">
                  {update.k === "latest" && <span className="text-primary">You're on the latest version.</span>}
                  {update.k === "error" && <span className="text-error">Couldn't reach GitHub — {update.msg}</span>}
                  {update.k === "legacy" && (
                    <span>Latest release {update.tag} — open the page to get it.</span>
                  )}
                  {update.k === "ready" && (
                    <span className="text-primary">v{update.tag.replace(/^v/, "")} is available.</span>
                  )}
                </span>
                {update.k === "ready" && (
                  <Btn variant="filled" theme={theme} small onClick={() => void installUpdate()} disabled={installing}>
                    <Download size={14} /> {installing ? "Downloading…" : "Install"}
                  </Btn>
                )}
                {(update.k === "legacy" || update.k === "error") && (
                  <Btn variant="text" small onClick={() => window.open(RELEASES_PAGE, "_blank")}>
                    Releases
                  </Btn>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
