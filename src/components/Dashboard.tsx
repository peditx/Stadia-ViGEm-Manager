import { invoke } from "@tauri-apps/api/core";
import {
  Gamepad2,
  BatteryCharging,
  Bluetooth,
  Cpu,
  Globe,
  Github,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Theme, AppConfig, ControllerStatus } from "../lib/types";
import { StatusCard, DriverRow, ToggleRow } from "./ui";

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
      {/* Hero Banner */}
      <div
        className={`relative rounded-2xl overflow-hidden p-8 flex items-center justify-between shadow-2xl bg-gradient-to-r ${theme.gradient}`}
      >
        <div className="relative z-10 text-white">
          <h2 className="text-3xl font-black mb-2 tracking-tight">
            STADIA COMMAND CENTER
          </h2>
          <p className="text-white/80 max-w-lg text-sm">
            Manage drivers, configure mappings, and monitor device status all in
            one place.
          </p>
          <div className="flex gap-3 mt-6">
            <a
              href="https://peditx.ir"
              target="_blank"
              className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Globe size={14} /> PeDitX.ir
            </a>
            <a
              href="https://github.com/peditx/Stadia-ViGEm-Manager"
              target="_blank"
              className="bg-black/20 hover:bg-black/30 backdrop-blur px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Github size={14} /> GitHub
            </a>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-black/20 to-transparent" />
        <Gamepad2
          className="absolute -right-6 -bottom-12 text-white/10 rotate-12"
          size={240}
        />
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          theme={theme}
          label="Controller Status"
          value={
            status.controller === "searching"
              ? "Searching"
              : connected
                ? `Connected (${status.deviceCount})`
                : "Disconnected"
          }
          icon={<Gamepad2 size={24} />}
          active={connected}
          color="green"
          subtext={
            connected ? "Ready for Gaming" : "Connect via USB or Bluetooth"
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
          label="Connection Mode"
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase">
              Driver Management
            </h3>
            <button
              onClick={() => void onRefresh()}
              className="p-1.5 hover:bg-white/10 rounded text-gray-400 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
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
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase">
            System Settings
          </h3>
          <div className="bg-[#1a1a1a] p-5 rounded-lg border border-white/5 space-y-4">
            <ToggleRow
              theme={theme}
              label="Auto-Start with Windows"
              checked={config.system.runOnStartup}
              onChange={(v) => updateConfig("system", "runOnStartup", v)}
            />
            <div className="pt-2">
              <label className="text-[10px] text-gray-500 font-bold mb-1 block">
                CONFIG LOCATION
              </label>
              <div className="flex gap-2">
                <div
                  className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-xs font-mono text-gray-300 truncate"
                  title={configPath}
                >
                  {configPath}
                </div>
                <button
                  onClick={() => invoke("open_config_dir").catch(() => {})}
                  className="p-2 hover:bg-white/10 rounded border border-white/10"
                  title="Open config folder"
                >
                  <FolderOpen size={14} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 text-[10px] text-gray-500 font-mono space-y-1">
              <div>LOCAL IP: {status.localIp}</div>
              <div>DEVICES: {status.deviceCount}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
