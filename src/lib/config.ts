import { AppConfig } from "./types";

export const DEFAULT_CONFIG: AppConfig = {
  system: {
    runOnStartup: true,
  },
  vibration: {
    strength: 100,
  },
  deadzones: {
    left: 10,
    right: 10,
    triggers: 5,
  },
  mobile: {
    enabled: false,
    port: 9090,
    token: "",
  },
  macrosEnabled: true,
  keybinds: {
    stadiaBtn: { mode: "xinput", value: "Guide", label: "Stadia", category: "Special" },
    assistantBtn: { mode: "shortcut", value: "Win + S", label: "Assistant", category: "Special" },
    captureBtn: { mode: "shortcut", value: "Win + Shift + S", label: "Capture", category: "Special" },
    optionsBtn: { mode: "xinput", value: "Start", label: "Options", category: "Menu" },
    menuBtn: { mode: "xinput", value: "Back", label: "Menu", category: "Menu" },
    faceA: { mode: "xinput", value: "A", label: "Face A", category: "Face" },
    faceB: { mode: "xinput", value: "B", label: "Face B", category: "Face" },
    faceX: { mode: "xinput", value: "X", label: "Face X", category: "Face" },
    faceY: { mode: "xinput", value: "Y", label: "Face Y", category: "Face" },
    lTrigger: { mode: "xinput", value: "LT", label: "L2 Trigger", category: "Triggers" },
    rTrigger: { mode: "xinput", value: "RT", label: "R2 Trigger", category: "Triggers" },
    lBumper: { mode: "xinput", value: "LB", label: "L1 Bumper", category: "Triggers" },
    rBumper: { mode: "xinput", value: "RB", label: "R1 Bumper", category: "Triggers" },
    lStickClick: { mode: "xinput", value: "L-Stick", label: "L3 Click", category: "Sticks" },
    rStickClick: { mode: "xinput", value: "R-Stick", label: "R3 Click", category: "Sticks" },
    // Select options are "Up"/"Down"/... — keep in sync with ButtonMapping's list.
    dpadUp: { mode: "xinput", value: "Up", label: "Up", category: "D-Pad" },
    dpadDown: { mode: "xinput", value: "Down", label: "Down", category: "D-Pad" },
    dpadLeft: { mode: "xinput", value: "Left", label: "Left", category: "D-Pad" },
    dpadRight: { mode: "xinput", value: "Right", label: "Right", category: "D-Pad" },
  },
  macros: [
    {
      id: "default_macro",
      name: "Rapid Fire (Sample)",
      steps: [
        { type: "press", key: "RT", ms: 50 },
        { type: "wait", ms: 50 },
        { type: "press", key: "RT", ms: 50 },
      ],
    },
  ],
};
