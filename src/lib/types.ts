export type ThemeKey = "blue" | "cyan" | "orange" | "purple" | "green";

export interface Theme {
  name: string;
  primary: string;
  hover: string;
  text: string;
  border: string;
  ring: string;
  accentBg: string;
  gradient: string;
  hex: string;
}

export interface SystemConfig {
  runOnStartup: boolean;
}

export interface VibrationConfig {
  strength: number;
}

export interface DeadzonesConfig {
  left: number;
  right: number;
  triggers: number;
}

export interface MobileConfig {
  enabled: boolean;
  port: number;
  token: string;
}

export type KeybindMode = "xinput" | "app" | "shortcut";

export interface Keybind {
  mode: KeybindMode;
  value: string;
  label: string;
  category: string;
}

export interface MacroStep {
  type: "press" | "wait";
  key?: string;
  ms?: number;
}

export interface Macro {
  id: string;
  name: string;
  steps: MacroStep[];
}

export interface AppConfig {
  system: SystemConfig;
  vibration: VibrationConfig;
  deadzones: DeadzonesConfig;
  mobile: MobileConfig;
  macrosEnabled: boolean;
  keybinds: Record<string, Keybind>;
  macros: Macro[];
}

export interface ControllerStatus {
  vigemBus: boolean;
  hidHide: boolean;
  driverCore: boolean;
  mobileService: boolean;
  controller: "searching" | "connected" | "disconnected";
  /** Charge 0-100, or -1 when the controller reports no battery. */
  battery: number;
  connection: "USB" | "Bluetooth" | "None";
  deviceCount: number;
  localIp: string;
}
