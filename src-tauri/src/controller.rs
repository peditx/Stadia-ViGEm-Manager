use crate::config::AppConfig;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};

// ==================== C FFI (engine.c + libstadia, compiled by build.rs) ====================

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct X360Report {
    pub buttons: u16,
    pub lt: u8,
    pub rt: u8,
    pub lx: i16,
    pub ly: i16,
    pub rx: i16,
    pub ry: i16,
}

#[repr(C)]
pub struct EngineBind {
    pub stadia_mask: u32,
    pub mode: i32,
    pub xusb: u16,
    pub trigger: u8,
    pub modifiers: u32,
    pub vk: u32,
    pub app: [u16; 260],
}

impl Default for EngineBind {
    fn default() -> Self {
        EngineBind { stadia_mask: 0, mode: 0, xusb: 0, trigger: 0, modifiers: 0, vk: 0, app: [0; 260] }
    }
}

#[repr(C)]
pub struct EngineHost {
    pub on_state: extern "C" fn(u64, *const X360Report),
    pub on_add: extern "C" fn(u64, i32),
    pub on_remove: extern "C" fn(u64),
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct EngineDeviceInfo {
    pub id: u64,
    pub is_bluetooth: i32,
    pub battery: i32,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct EngineMacroStep {
    pub kind: u32,
    pub xusb: u16,
    pub trigger: u8,
    pub ms: u32,
}

extern "C" {
    fn engine_init(host: *const EngineHost) -> i32;
    fn engine_shutdown();
    fn engine_refresh() -> i32;
    fn engine_copy_devices(out: *mut EngineDeviceInfo, max: i32) -> i32;
    fn engine_set_binds(binds: *const EngineBind, count: i32);
    fn engine_set_deadzones(left: u8, right: u8, trigger: u8);
    fn engine_set_vibration_strength(strength: u8);
    fn engine_notify_rumble(id: u64, large: u8, small: u8);
    fn engine_test_rumble(strength: u8) -> i32;
    fn engine_run_macro(steps: *const EngineMacroStep, count: i32) -> i32;
    fn engine_stop_macro();
}

// ==================== Status ====================

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ControllerStatus {
    pub vigem_bus: bool,
    pub hid_hide: bool,
    pub driver_core: bool,
    pub mobile_service: bool,
    pub controller: String,
    pub battery: i32, // -1 = unknown (pad did not expose a battery usage)
    pub connection: String,
    pub device_count: i32,
    pub local_ip: String,
}

#[derive(Clone, Copy, Debug)]
pub struct DeviceInfo {
    pub is_bluetooth: bool,
    /// Charge 0-100, or -1 when the controller reports none.
    pub battery: i32,
}

/// A keybind the engine could not honour. Surfaced to the UI so a bad value
/// reads as "invalid" instead of "the app is broken".
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BindWarning {
    pub key: String,
    pub message: String,
}

static CORE_RUNNING: AtomicBool = AtomicBool::new(false);

pub fn is_running() -> bool {
    CORE_RUNNING.load(Ordering::SeqCst)
}

// ==================== Engine lifecycle ====================

extern "C" fn on_state(id: u64, report: *const X360Report) {
    if report.is_null() {
        return;
    }
    unsafe { crate::vigem::push(id, &*report) };
}

extern "C" fn on_add(id: u64, _is_bluetooth: i32) {
    if let Err(e) = crate::vigem::add_target(id) {
        eprintln!("vigem add_target({}): {}", id, e);
    }
}

extern "C" fn on_remove(id: u64) {
    crate::vigem::remove_target(id);
}

/// Called from the ViGEm rumble notification thread.
pub fn notify_rumble_from_bus(id: u64, large: u8, small: u8) {
    unsafe { engine_notify_rumble(id, large, small) };
}

pub fn start() {
    if CORE_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    let host = EngineHost { on_state, on_add, on_remove };
    unsafe {
        engine_init(&host);
    }
}

pub fn stop() {
    if !CORE_RUNNING.swap(false, Ordering::SeqCst) {
        return;
    }
    unsafe {
        engine_stop_macro();
        engine_shutdown();
    }
}

pub fn refresh() {
    if is_running() {
        unsafe {
            engine_refresh();
        }
    }
}

pub fn device_infos() -> Vec<DeviceInfo> {
    let mut buf = [EngineDeviceInfo { id: 0, is_bluetooth: 0, battery: -1 }; 4];
    let n = unsafe { engine_copy_devices(buf.as_mut_ptr(), buf.len() as i32) };
    buf[..n.max(0) as usize]
        .iter()
        .map(|d| DeviceInfo {
            is_bluetooth: d.is_bluetooth != 0,
            battery: d.battery,
        })
        .collect()
}

// ==================== Config application ====================

/// Push the config into the C engine. Returns one warning per keybind that
/// could not be turned into a bind (see `build_binds`).
pub fn apply_config(cfg: &AppConfig) -> Vec<BindWarning> {
    let (binds, warnings) = build_binds(cfg);
    unsafe {
        engine_set_binds(binds.as_ptr(), binds.len() as i32);
        engine_set_deadzones(
            cfg.deadzones.left.min(90),
            cfg.deadzones.right.min(90),
            cfg.deadzones.triggers.min(90),
        );
        engine_set_vibration_strength(cfg.vibration.strength.min(100));
    }
    warnings
}

fn stadia_mask_for(key: &str) -> Option<u32> {
    Some(match key {
        "faceA" => 0x0001,
        "faceB" => 0x0002,
        "faceX" => 0x0004,
        "faceY" => 0x0008,
        "lBumper" => 0x0010,
        "rBumper" => 0x0020,
        "lStickClick" => 0x0040,
        "rStickClick" => 0x0080,
        "dpadUp" => 0x0100,
        "dpadDown" => 0x0200,
        "dpadLeft" => 0x0400,
        "dpadRight" => 0x0800,
        "optionsBtn" => 0x1000,
        "menuBtn" => 0x2000,
        "stadiaBtn" => 0x4000,
        "captureBtn" => 0x8000,
        "assistantBtn" => 0x10000,
        _ => return None,
    })
}

/// Accepts the select values ("Up", "L-Stick"…) and the legacy "D-Pad Up" style.
fn xusb_for_value(v: &str) -> Option<u16> {
    Some(match v.trim().to_ascii_lowercase().as_str() {
        "a" => 0x1000,
        "b" => 0x2000,
        "x" => 0x4000,
        "y" => 0x8000,
        "start" => 0x0010,
        "back" => 0x0020,
        "guide" => 0x0400,
        "lb" => 0x0100,
        "rb" => 0x0200,
        "l-stick" | "lthumb" => 0x0040,
        "r-stick" | "rthumb" => 0x0080,
        "up" | "d-pad up" => 0x0001,
        "down" | "d-pad down" => 0x0002,
        "left" | "d-pad left" => 0x0004,
        "right" | "d-pad right" => 0x0008,
        // Triggers stay analog passthrough — never rebound digitally.
        "lt" | "rt" => return None,
        _ => return None,
    })
}

fn vk_for_token(token: &str) -> Option<u32> {
    let t = token.trim();
    if t.is_empty() {
        return None;
    }
    let upper = t.to_ascii_uppercase();
    let bytes = upper.as_bytes();
    if bytes.len() == 1 {
        let c = bytes[0];
        if c.is_ascii_alphanumeric() {
            return Some(c as u32);
        }
    }
    if let Some(rest) = upper.strip_prefix('F') {
        if let Ok(n) = rest.parse::<u32>() {
            if (1..=12).contains(&n) {
                return Some(0x70 + n - 1);
            }
        }
    }
    Some(match upper.as_str() {
        // "Plus": the recorder cannot emit a bare "+", parse_shortcut splits on it.
        "PLUS" => 0xBB,
        "ENTER" | "RETURN" => 0x0D,
        "SPACE" => 0x20,
        "ESC" | "ESCAPE" => 0x1B,
        "TAB" => 0x09,
        "UP" | "ARROWUP" => 0x26,
        "DOWN" | "ARROWDOWN" => 0x28,
        "LEFT" | "ARROWLEFT" => 0x25,
        "RIGHT" | "ARROWRIGHT" => 0x27,
        "PGUP" => 0x21,
        "PGDN" => 0x22,
        "HOME" => 0x24,
        "END" => 0x23,
        "INS" => 0x2D,
        "DEL" | "DELETE" => 0x2E,
        _ => return None,
    })
}

/// Handles both the recorder format ("CTRL+SHIFT+S") and the spaced defaults ("Win + S").
fn parse_shortcut(s: &str) -> Option<(u32, u32)> {
    let mut modifiers = 0u32;
    let mut vk = 0u32;
    let mut seen_key = false;

    for part in s.split('+') {
        let t = part.trim();
        if t.is_empty() {
            continue;
        }
        match t.to_ascii_uppercase().as_str() {
            "CTRL" | "CONTROL" => modifiers |= 0x2,
            "SHIFT" => modifiers |= 0x4,
            "ALT" => modifiers |= 0x1,
            // META/WINKEY: what the frontend recorder emits for the Windows key
            // on some platforms — without these the bind is dropped silently.
            "WIN" | "WINDOWS" | "META" | "WINKEY" | "SUPER" => modifiers |= 0x8,
            _ => {
                if seen_key {
                    return None; // one non-modifier key per shortcut
                }
                vk = vk_for_token(t)?;
                seen_key = true;
            }
        }
    }
    if !seen_key {
        return None;
    }
    Some((modifiers, vk))
}

fn wide(s: &str) -> [u16; 260] {
    let mut arr = [0u16; 260];
    for (i, u) in s.encode_utf16().take(259).enumerate() {
        arr[i] = u;
    }
    arr
}

/// Builds the engine bind table, plus a warning for every keybind that could
/// not be represented. Without these a bad value silently vanishes and the
/// button just does nothing.
pub fn build_binds(cfg: &AppConfig) -> (Vec<EngineBind>, Vec<BindWarning>) {
    let mut out = Vec::new();
    let mut warnings = Vec::new();

    for (key, kb) in &cfg.keybinds {
        let mask = match stadia_mask_for(key) {
            Some(m) => m,
            None => {
                // Triggers stay analog passthrough — an intentional no-op, not a
                // mistake. Anything else here is a bad key id.
                if key != "lTrigger" && key != "rTrigger" {
                    warnings.push(BindWarning {
                        key: key.clone(),
                        message: format!("\"{}\" is not a Stadia button", key),
                    });
                }
                continue;
            }
        };

        match kb.mode.as_str() {
            "xinput" => match xusb_for_value(&kb.value) {
                Some(xusb) => out.push(EngineBind {
                    stadia_mask: mask,
                    mode: 0,
                    xusb,
                    ..Default::default()
                }),
                None => warnings.push(BindWarning {
                    key: key.clone(),
                    message: format!("\"{}\" is not an Xbox button", kb.value),
                }),
            },
            "shortcut" => match parse_shortcut(&kb.value) {
                Some((modifiers, vk)) => out.push(EngineBind {
                    stadia_mask: mask,
                    mode: 1,
                    modifiers,
                    vk,
                    ..Default::default()
                }),
                None => warnings.push(BindWarning {
                    key: key.clone(),
                    message: format!("\"{}\" is not a valid shortcut", kb.value),
                }),
            },
            "app" => {
                // Clearing the field is deliberate — no warning.
                if !kb.value.trim().is_empty() {
                    out.push(EngineBind {
                        stadia_mask: mask,
                        mode: 2,
                        app: wide(kb.value.trim()),
                        ..Default::default()
                    });
                }
            }
            other => warnings.push(BindWarning {
                key: key.clone(),
                message: format!("Unknown binding mode \"{}\"", other),
            }),
        }
    }

    warnings.sort_by(|a, b| a.key.cmp(&b.key));
    (out, warnings)
}

// ==================== Rumble / macros ====================

pub fn test_rumble(strength: u8) -> Result<(), String> {
    let devices = device_infos();
    if !devices.iter().any(|d| !d.is_bluetooth) {
        return Err(if devices.is_empty() {
            "Rumble requires a USB connection".to_string()
        } else {
            "Rumble needs a USB connection — Windows cannot vibrate over Bluetooth".to_string()
        });
    }
    let ok = unsafe { engine_test_rumble(strength.min(100)) } != 0;
    if ok {
        Ok(())
    } else {
        Err("Rumble requires a USB connection".into())
    }
}

pub fn run_macro(cfg: &AppConfig, id: &str) -> Result<(), String> {
    if !cfg.macros_enabled {
        return Err("Macros are disabled — enable them in the Macros tab".into());
    }
    let m = cfg
        .macros
        .iter()
        .find(|m| m.id == id)
        .ok_or_else(|| "Macro not found".to_string())?;

    let mut steps = Vec::with_capacity(m.steps.len());
    for s in &m.steps {
        if s.step_type == "wait" {
            steps.push(EngineMacroStep { kind: 1, xusb: 0, trigger: 0, ms: s.ms.unwrap_or(50) });
        } else {
            let key = s.key.clone().unwrap_or_default();
            let ms = s.ms.unwrap_or(50).max(10);
            let lower = key.to_ascii_lowercase();
            let (xusb, trigger) = if lower == "lt" {
                (0u16, 1u8)
            } else if lower == "rt" {
                (0u16, 2u8)
            } else {
                (
                    xusb_for_value(&key)
                        .ok_or_else(|| format!("Unknown macro key: {}", key))?,
                    0u8,
                )
            };
            steps.push(EngineMacroStep { kind: 0, xusb, trigger, ms });
        }
    }

    let ok = unsafe { engine_run_macro(steps.as_ptr(), steps.len() as i32) } != 0;
    if ok {
        Ok(())
    } else {
        Err("Could not start the macro (is the driver core running?)".into())
    }
}

// ==================== Status building ====================

pub fn build_status() -> ControllerStatus {
    let devices = device_infos();
    let count = devices.len() as i32;
    let usb = devices.iter().any(|d| !d.is_bluetooth);
    let bt = devices.iter().any(|d| d.is_bluetooth);

    ControllerStatus {
        vigem_bus: crate::drivers::vigem_installed(),
        hid_hide: crate::drivers::hidhide_installed(),
        driver_core: is_running() && crate::vigem::connected(),
        mobile_service: crate::mobile::is_running(),
        controller: if count > 0 { "connected".into() } else { "disconnected".into() },
        battery: devices
            .iter()
            .map(|d| d.battery)
            .filter(|b| *b >= 0)
            .min()
            .unwrap_or(-1),
        connection: if usb {
            "USB".into()
        } else if bt {
            "Bluetooth".into()
        } else {
            "None".into()
        },
        device_count: count,
        local_ip: crate::drivers::local_ip(),
    }
}
