import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemeKey, AppConfig, ControllerStatus } from "./lib/types";
import { THEMES } from "./lib/themes";
import { DEFAULT_CONFIG } from "./lib/config";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ButtonMapping from "./components/ButtonMapping";
import Macros from "./components/Macros";
import Vibration from "./components/Vibration";
import MobileRemote from "./components/MobileRemote";
import Header from "./components/Header";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [themeKey, setThemeKey] = useState<ThemeKey>("blue");
  const theme = THEMES[themeKey];
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [configPath, setConfigPath] = useState("./config.json");
  const [status, setStatus] = useState<ControllerStatus>({
    vigemBus: false,
    hidHide: false,
    driverCore: false,
    mobileService: false,
    controller: "searching",
    battery: -1,
    connection: "None",
    deviceCount: 0,
    localIp: "127.0.0.1",
  });

  // Load config once, then poll real status every 2s
  useEffect(() => {
    invoke<AppConfig>("get_config")
      .then((cfg) => setConfig(cfg))
      .catch(() => {});

    invoke<string>("get_config_path")
      .then(setConfigPath)
      .catch(() => {});

    const pull = () =>
      invoke<ControllerStatus>("get_status")
        .then(setStatus)
        .catch(() => {});
    pull();
    const timer = setInterval(pull, 2000);
    return () => clearInterval(timer);
  }, []);

  const updateConfig = (
    section: string | null,
    key: string,
    value: unknown,
  ) => {
    setConfig((prev) => {
      if (section === null) return { ...prev, [key]: value };
      return {
        ...prev,
        [section]: { ...(prev[section as keyof AppConfig] as Record<string, unknown>), [key]: value },
      };
    });
  };

  const handleSaveConfig = async () => {
    try {
      const r = await invoke<{ path: string }>("save_config", { cfg: config });
      if (r?.path) setConfigPath(r.path);
    } catch (e) {
      alert(`Could not save config:\n${String(e)}`);
    }
  };

  const handleRefresh = async () => {
    try {
      const s = await invoke<ControllerStatus>("refresh_devices");
      setStatus(s);
    } catch (e) {
      alert(`Refresh failed:\n${String(e)}`);
    }
  };

  const handleDriverAction = async (name: string, action: string) => {
    const msg = await invoke<string>("driver_action", { name, action });
    try {
      setStatus(await invoke<ControllerStatus>("get_status"));
    } catch {}
    return msg;
  };

  return (
    <div className="flex h-screen bg-[#0b0c10] text-gray-200 font-sans overflow-hidden select-none">
      <Sidebar
        theme={theme}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        configPath={configPath}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#111]">
        <Header
          theme={theme}
          themeKey={themeKey}
          onThemeChange={setThemeKey}
          onSave={handleSaveConfig}
        />

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "dashboard" && (
            <Dashboard
              theme={theme}
              config={config}
              status={status}
              updateConfig={updateConfig}
              onRefresh={handleRefresh}
              onDriverAction={handleDriverAction}
              configPath={configPath}
            />
          )}
          {activeTab === "mapping" && (
            <ButtonMapping theme={theme} config={config} updateConfig={updateConfig} />
          )}
          {activeTab === "macros" && (
            <Macros theme={theme} config={config} updateConfig={updateConfig} />
          )}
          {activeTab === "vibration" && (
            <Vibration theme={theme} config={config} updateConfig={updateConfig} />
          )}
          {activeTab === "mobile" && (
            <MobileRemote
              theme={theme}
              config={config}
              updateConfig={updateConfig}
              status={status}
              onDriverAction={handleDriverAction}
            />
          )}
        </div>
      </main>
    </div>
  );
}
