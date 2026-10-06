mod config;
mod controller;
mod drivers;
mod mobile;
mod vigem;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::sync::OnceLock;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, RunEvent, State, WindowEvent};

pub struct AppState {
    pub config: Mutex<config::AppConfig>,
}

static PUMP_RUNNING: AtomicBool = AtomicBool::new(false);

/// Set only by the tray's Quit item. Everything else that wants the process gone
/// (closing the last window, runtime shutdown) must be answered with "keep
/// running" — otherwise hiding to tray takes the whole app down with it.
static QUIT_REQUESTED: AtomicBool = AtomicBool::new(false);

/// Outcome of pushing a config into the runtime. `path` is set only when the
/// config was also written to disk; `warnings` lists every keybind the engine
/// refused, so the UI can mark the row instead of silently doing nothing.
#[derive(serde::Serialize)]
pub struct ApplyResult {
    pub success: bool,
    pub path: Option<String>,
    pub warnings: Vec<controller::BindWarning>,
}

// ------------------------- Commands -------------------------

#[tauri::command]
fn get_config(state: State<AppState>) -> config::AppConfig {
    state.config.lock().unwrap().clone()
}

/// Push a config to everything that reads it: engine binds/deadzones/vibration,
/// the mobile service and the startup registry — everything *except* disk.
/// Shared by `save_config` (which then persists) and the debounced `apply_live`.
fn apply(state: &State<AppState>, cfg: &config::AppConfig) -> Vec<controller::BindWarning> {
    let warnings = controller::apply_config(cfg);
    mobile::set_rumble_strength(cfg.vibration.strength);

    // Startup registry: only write when runOnStartup actually changed
    // (avoids spawning reg.exe on every deadzone tweak).
    let old_cfg = state.config.lock().unwrap().clone();
    if cfg.system.run_on_startup != old_cfg.system.run_on_startup {
        drivers::set_run_on_startup(cfg.system.run_on_startup).ok();
    }

    // Keep the mobile service in line with the toggle/port.
    mobile::reconcile_mobile(cfg);

    *state.config.lock().unwrap() = cfg.clone();
    // Deliberately NOT emitting `config-changed` here: this runs for the UI's
    // own `apply_live`, and echoing back would setConfig → apply_live → … forever.
    // Only mobile.rs emits, when a phone changed the config.
    warnings
}

/// Bridge for mobile.rs to emit config-changed events back to the UI.
static CONFIG_EMITTER: OnceLock<tauri::AppHandle> = OnceLock::new();

pub fn set_config_emitter(app: tauri::AppHandle) {
    CONFIG_EMITTER.set(app).ok();
}

pub fn emit_config_changed(cfg: &config::AppConfig) {
    if let Some(app) = CONFIG_EMITTER.get() {
        let _ = app.emit("config-changed", cfg);
    }
}

#[tauri::command]
fn save_config(state: State<AppState>, cfg: config::AppConfig) -> Result<ApplyResult, String> {
    config::save_config(&cfg)?;
    let warnings = apply(&state, &cfg);
    Ok(ApplyResult { success: true, path: Some(config::config_path()), warnings })
}

/// Fire-and-forget auto-apply from the UI (debounced). Writes nothing.
#[tauri::command]
fn apply_live(state: State<AppState>, cfg: config::AppConfig) -> ApplyResult {
    let warnings = apply(&state, &cfg);
    ApplyResult { success: true, path: None, warnings }
}

/// `async` so a slow device teardown inside `engine_refresh` runs off the main
/// thread — otherwise a disconnect can wedge the whole webview.
#[tauri::command(async)]
fn get_status() -> controller::ControllerStatus {
    controller::build_status()
}

#[tauri::command(async)]
fn refresh_devices() -> controller::ControllerStatus {
    controller::refresh();
    controller::build_status()
}

#[tauri::command]
fn test_rumble(strength: u8) -> Result<String, String> {
    controller::test_rumble(strength)?;
    Ok(format!("Rumble test at {}%", strength.min(100)))
}

#[tauri::command]
fn get_mobile_token() -> Option<String> {
    mobile::get_token()
}

/// `async` so the UAC wait inside `netsh` never blocks a command or the webview.
#[tauri::command(async)]
fn open_firewall(port: u16) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || drivers::ensure_firewall_rule(port))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn driver_action(
    name: String,
    action: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let cfg = state.config.lock().unwrap().clone();
    tauri::async_runtime::spawn_blocking(move || drivers::driver_action(&name, &action, &cfg))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn run_macro(id: String, state: State<AppState>) -> Result<String, String> {
    let cfg = state.config.lock().unwrap().clone();
    controller::run_macro(&cfg, &id)?;
    Ok("Macro started".into())
}

#[tauri::command]
fn get_config_path() -> String {
    config::config_path()
}

#[tauri::command]
fn open_config_dir() -> Result<(), String> {
    drivers::open_folder(&config::config_dir())
}

// ------------------------- Tray -------------------------

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show window", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, "refresh", "Refresh devices", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &refresh, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("Stadia Manager")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
            "refresh" => controller::refresh(),
            "quit" => {
                QUIT_REQUESTED.store(true, Ordering::SeqCst);
                app.exit(0);
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

// ------------------------- Entry -------------------------

pub fn run() {
    let cfg = config::load_config();

    // Bring up the stack; missing drivers are reported through get_status.
    vigem::init().ok();
    controller::start();
    let _ = controller::apply_config(&cfg);
    mobile::set_rumble_strength(cfg.vibration.strength);
    if cfg.mobile.enabled {
        mobile::start(cfg.mobile.port).ok();
    }
    drivers::set_run_on_startup(cfg.system.run_on_startup).ok();

    // Hot-plug pump: enumerate HID once a second while the app lives.
    PUMP_RUNNING.store(true, Ordering::SeqCst);
    std::thread::spawn(|| {
        while PUMP_RUNNING.load(Ordering::SeqCst) {
            controller::refresh();
            std::thread::sleep(std::time::Duration::from_millis(1000));
        }
    });

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState { config: Mutex::new(cfg) })
        .on_window_event(|window, event| {
            // Close hides to tray; quit lives in the tray menu.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            build_tray(app.handle())?;
            crate::set_config_emitter(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            apply_live,
            get_status,
            refresh_devices,
            test_rumble,
            get_mobile_token,
            open_firewall,
            driver_action,
            run_macro,
            get_config_path,
            open_config_dir,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    // Close → hide, then keep the runtime alive: only the tray's Quit may end
    // the process. Without this the webview can drop to zero visible windows and
    // take the app down instead of parking it in the tray.
    app.run(|_app, event| {
        if let RunEvent::ExitRequested { api, .. } = event {
            if !QUIT_REQUESTED.load(Ordering::SeqCst) {
                api.prevent_exit();
            }
        }
    });

    // App exited (tray Quit).
    PUMP_RUNNING.store(false, Ordering::SeqCst);
    mobile::stop();
    controller::stop();
    vigem::shutdown();
}
