use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub system: SystemConfig,
    pub vibration: VibrationConfig,
    pub deadzones: DeadzonesConfig,
    pub mobile: MobileConfig,
    pub macros_enabled: bool,
    pub keybinds: HashMap<String, Keybind>,
    pub macros: Vec<MacroDef>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SystemConfig {
    pub run_on_startup: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VibrationConfig {
    pub strength: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DeadzonesConfig {
    pub left: u8,
    pub right: u8,
    pub triggers: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MobileConfig {
    pub enabled: bool,
    pub port: u16,
    #[serde(default)]
    pub token: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Keybind {
    pub mode: String,
    pub value: String,
    pub label: String,
    pub category: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MacroDef {
    pub id: String,
    pub name: String,
    pub steps: Vec<MacroStep>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MacroStep {
    #[serde(rename = "type")]
    pub step_type: String,
    pub key: Option<String>,
    pub ms: Option<u32>,
}

pub fn config_path() -> String {
    let dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("stadia-manager");
    fs::create_dir_all(&dir).ok();
    dir.join("config.json").to_string_lossy().to_string()
}

pub fn config_dir() -> String {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("stadia-manager")
        .to_string_lossy()
        .to_string()
}

pub fn load_config() -> AppConfig {
    let path = config_path();
    match fs::read_to_string(&path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_else(|_| default_config()),
        Err(_) => default_config(),
    }
}

pub fn save_config(cfg: &AppConfig) -> Result<(), String> {
    let path = config_path();
    let json = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn default_config() -> AppConfig {
    let mut keybinds = HashMap::new();
    keybinds.insert("stadiaBtn".into(), Keybind { mode: "xinput".into(), value: "Guide".into(), label: "Stadia".into(), category: "Special".into() });
    keybinds.insert("assistantBtn".into(), Keybind { mode: "shortcut".into(), value: "Win + S".into(), label: "Assistant".into(), category: "Special".into() });
    keybinds.insert("captureBtn".into(), Keybind { mode: "shortcut".into(), value: "Win + Shift + S".into(), label: "Capture".into(), category: "Special".into() });
    keybinds.insert("optionsBtn".into(), Keybind { mode: "xinput".into(), value: "Start".into(), label: "Options".into(), category: "Menu".into() });
    keybinds.insert("menuBtn".into(), Keybind { mode: "xinput".into(), value: "Back".into(), label: "Menu".into(), category: "Menu".into() });
    keybinds.insert("faceA".into(), Keybind { mode: "xinput".into(), value: "A".into(), label: "Face A".into(), category: "Face".into() });
    keybinds.insert("faceB".into(), Keybind { mode: "xinput".into(), value: "B".into(), label: "Face B".into(), category: "Face".into() });
    keybinds.insert("faceX".into(), Keybind { mode: "xinput".into(), value: "X".into(), label: "Face X".into(), category: "Face".into() });
    keybinds.insert("faceY".into(), Keybind { mode: "xinput".into(), value: "Y".into(), label: "Face Y".into(), category: "Face".into() });
    keybinds.insert("lTrigger".into(), Keybind { mode: "xinput".into(), value: "LT".into(), label: "L2 Trigger".into(), category: "Triggers".into() });
    keybinds.insert("rTrigger".into(), Keybind { mode: "xinput".into(), value: "RT".into(), label: "R2 Trigger".into(), category: "Triggers".into() });
    keybinds.insert("lBumper".into(), Keybind { mode: "xinput".into(), value: "LB".into(), label: "L1 Bumper".into(), category: "Triggers".into() });
    keybinds.insert("rBumper".into(), Keybind { mode: "xinput".into(), value: "RB".into(), label: "R1 Bumper".into(), category: "Triggers".into() });
    keybinds.insert("lStickClick".into(), Keybind { mode: "xinput".into(), value: "L-Stick".into(), label: "L3 Click".into(), category: "Sticks".into() });
    keybinds.insert("rStickClick".into(), Keybind { mode: "xinput".into(), value: "R-Stick".into(), label: "R3 Click".into(), category: "Sticks".into() });
    keybinds.insert("dpadUp".into(), Keybind { mode: "xinput".into(), value: "Up".into(), label: "Up".into(), category: "D-Pad".into() });
    keybinds.insert("dpadDown".into(), Keybind { mode: "xinput".into(), value: "Down".into(), label: "Down".into(), category: "D-Pad".into() });
    keybinds.insert("dpadLeft".into(), Keybind { mode: "xinput".into(), value: "Left".into(), label: "Left".into(), category: "D-Pad".into() });
    keybinds.insert("dpadRight".into(), Keybind { mode: "xinput".into(), value: "Right".into(), label: "Right".into(), category: "D-Pad".into() });

    AppConfig {
        system: SystemConfig { run_on_startup: true },
        vibration: VibrationConfig { strength: 100 },
        deadzones: DeadzonesConfig { left: 10, right: 10, triggers: 5 },
        mobile: MobileConfig { enabled: false, port: 9090, token: String::new() },
        macros_enabled: true,
        keybinds,
        macros: vec![MacroDef {
            id: "default_macro".into(),
            name: "Rapid Fire (Sample)".into(),
            steps: vec![
                MacroStep { step_type: "press".into(), key: Some("RT".into()), ms: Some(50) },
                MacroStep { step_type: "wait".into(), key: None, ms: Some(50) },
                MacroStep { step_type: "press".into(), key: Some("RT".into()), ms: Some(50) },
            ],
        }],
    }
}
