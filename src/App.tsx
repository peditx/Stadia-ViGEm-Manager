import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ThemeKey, AppConfig, ControllerStatus } from "./lib/types";
import { THEMES } from "./lib/themes";
import { themeRoles } from "./lib/color";
import { DEFAULT_CONFIG } from "./lib/config";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ButtonMapping from "./components/ButtonMapping";
import Macros from "./components/Macros";
import Vibration from "./components/Vibration";
import MobileRemote from "./components/MobileRemote";
import Header from "./components/Header";
import { ToastContainer, showToast } from "./components/ui";

const THEME_KEY = "stadia.theme";

function readTheme(): ThemeKey {
  const saved = localStorage.getItem(THEME_KEY);
  return saved && saved in THEMES ? (saved as ThemeKey) : "green";
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    // Initial fallback; will be overwritten by config load
    return readTheme();
  });
  const theme = THEMES[themeKey];
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [configPath, setConfigPath] = useState("./config.json");
  const [appVersion, setAppVersion] = useState("2.2.0");
  // Snapshot of the last config written to disk, for the "unsaved" chip.
  const [savedJson, setSavedJson] = useState("");
  const hydrated = useRef(false);
  const applyTimer = useRef<number | undefined>(undefined);
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
  const [bindWarnings, setBindWarnings] = useState<Record<string, string>>({});

  // Drive the M3 accent roles from the picked theme (see globals.css :root).
  useEffect(() => {
    const r = themeRoles(theme.hex);
    const root = document.documentElement;
    root.style.setProperty("--m3-primary", r.primary);
    root.style.setProperty("--m3-on-primary", r.onPrimary);
    root.style.setProperty("--m3-primary-container", r.primaryContainer);
    root.style.setProperty("--m3-on-primary-container", r.onPrimaryContainer);
    localStorage.setItem(THEME_KEY, themeKey);
    // Persist themeKey to config so it survives restarts
    updateConfig(null, "themeKey", themeKey);
  }, [themeKey, theme.hex]);

  // Load config once, then poll real status every 2s
  useEffect(() => {
    invoke<AppConfig>("get_config")
      .then((cfg) => {
        hydrated.current = true;
        setSavedJson(JSON.stringify(cfg));
        setConfig(cfg);
        if (cfg.themeKey && cfg.themeKey in THEMES) {
          setThemeKey(cfg.themeKey as ThemeKey);
        }
      })
      .catch(() => {
        hydrated.current = true;
      });

    invoke<string>("get_config_path")
      .then(setConfigPath)
      .catch(() => {});

    invoke<string>("get_app_version")
      .then(setAppVersion)
      .catch(() => {});

    const pull = () =>
      invoke<ControllerStatus>("get_status")
        .then(setStatus)
        .catch(() => {});
    pull();
    const timer = setInterval(pull, 2000);

    // Listen for config changes from mobile remote
    let unlisten: UnlistenFn | null = null;
    listen<AppConfig>("config-changed", (event) => {
      setConfig(event.payload);
      setSavedJson(JSON.stringify(event.payload));
    }).then((fn) => { unlisten = fn; });

    return () => {
      clearInterval(timer);
      unlisten?.();
    };
  }, []);

  // Auto-apply: every edit reaches the engine ~300ms after you stop touching
  // it. Save only writes the file (so the choice survives a restart).
  useEffect(() => {
    if (!hydrated.current) return;
    window.clearTimeout(applyTimer.current);
    applyTimer.current = window.setTimeout(() => {
      invoke<{ warnings: { key: string; message: string }[] }>("apply_live", { cfg: config })
        .then((r) => {
          if (r?.warnings) {
            setBindWarnings((prev) => {
              const next = { ...prev };
              for (const w of r.warnings) next[w.key] = w.message;
              return next;
            });
          }
        })
        .catch(() => {});
    }, 300);
    return () => window.clearTimeout(applyTimer.current);
  }, [config]);

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
      const r = await invoke<{ path?: string; warnings: { key: string; message: string }[] }>("save_config", { cfg: config });
      if (r?.path) setConfigPath(r.path);
      setSavedJson(JSON.stringify(config));
      if (r?.warnings) {
        setBindWarnings((prev) => {
          const next = { ...prev };
          for (const w of r.warnings) next[w.key] = w.message;
          return next;
        });
      }
      showToast("Config saved", "success");
    } catch (e) {
      showToast(`Could not save config: ${String(e)}`, "error");
    }
  };

  const handleRefresh = async () => {
    try {
      const s = await invoke<ControllerStatus>("refresh_devices");
      setStatus(s);
      showToast("Devices refreshed", "success");
    } catch (e) {
      showToast(`Refresh failed: ${String(e)}`, "error");
    }
  };

  const handleDriverAction = async (name: string, action: string) => {
    try {
      const msg = await invoke<string>("driver_action", { name, action });
      setStatus(await invoke<ControllerStatus>("get_status"));
      showToast(msg, "success");
      return msg;
    } catch (e) {
      const err = String(e);
      showToast(err, "error");
      throw e;
    }
  };

  return (
    <div className="flex h-screen bg-surface text-on-surface font-sans overflow-hidden select-none">
      <Sidebar
        theme={theme}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        configPath={configPath}
        version={appVersion}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-surface">
        <Header
          theme={theme}
          themeKey={themeKey}
          onThemeChange={setThemeKey}
          onSave={handleSaveConfig}
          status={status}
          dirty={savedJson !== "" && JSON.stringify(config) !== savedJson}
        />

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === "dashboard" && (
            <Dashboard
              theme={theme}
              config={config}
              status={status}
              updateConfig={updateConfig}
              onRefresh={handleRefresh}
              onDriverAction={handleDriverAction}
              configPath={configPath}
              appVersion={appVersion}
            />
          )}
          {activeTab === "mapping" && (
            <ButtonMapping theme={theme} config={config} updateConfig={updateConfig} warnings={bindWarnings} />
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
            />
          )}
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
