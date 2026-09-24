import { invoke } from "@tauri-apps/api/core";
import {
  Gamepad2,
  BatteryCharging,
  Bluetooth,
  Cpu,
  Globe,
  Github,
  FolderOpen,
} from "lucide-react";
import { Theme, AppConfig, ControllerStatus } from "../lib/types";
import { StatusCard, DriverRow, ToggleRow, Overline, Btn, IconBtn } from "./ui";

interface DashboardProps {
  theme: Theme;
  config: AppConfig;
  status: ControllerStatus;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
  onRefresh: () => void | Promise<void>;
  onDriverAction: (name: string, action: string) => Promise<string>;
  configPath: string;
}

export default function Dashboard({
  theme,
  config,
  status,
  updateConfig,
  onRefresh,
  onDriverAction,
  configPath,
}: DashboardProps) {
  const connected = status.controller === "connected";
  const battery =
    status.battery >= 0 ? `${status.battery}%` : connected ? "AC" : "—";

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
          icon={<BatteryCharging size={20} />}
          active={connected}
          color="blue"
          subtext={connected ? "No battery reading over HID" : undefined}
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
          </div>
        </div>
      </div>
    </div>
  );
}
