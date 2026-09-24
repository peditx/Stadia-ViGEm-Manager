mod config;
mod controller;
mod drivers;
mod mobile;
mod vigem;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, State, WindowEvent};

pub struct AppState {
    pub config: Mutex<config::AppConfig>,
}

static PUMP_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(serde::Serialize)]
pub struct SaveResult {
    pub success: bool,
    pub path: String,
}

// ------------------------- Commands -------------------------

#[tauri::command]
fn get_config(state: State<AppState>) -> config::AppConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn save_config(state: State<AppState>, cfg: config::AppConfig) -> Result<SaveResult, String> {
    config::save_config(&cfg)?;
    controller::apply_config(&cfg);
    mobile::set_rumble_strength(cfg.vibration.strength);

    // Startup registry: best effort, never blocks a save.
    drivers::set_run_on_startup(cfg.system.run_on_startup).ok();

    // Keep the mobile service in line with the toggle.
    if cfg.mobile.enabled {
        if !mobile::is_running() {
            mobile::start(cfg.mobile.port).ok();
        }
    } else {
        mobile::stop();
    }

    *state.config.lock().unwrap() = cfg;
    Ok(SaveResult { success: true, path: config::config_path() })
}

#[tauri::command]
fn get_status() -> controller::ControllerStatus {
    controller::build_status()
}

#[tauri::command]
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
        .tooltip("Stadia ViGEm Manager")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
            "refresh" => controller::refresh(),
            "quit" => app.exit(0),
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
    controller::apply_config(&cfg);
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

    tauri::Builder::default()
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            get_status,
            refresh_devices,
            test_rumble,
            driver_action,
            run_macro,
            get_config_path,
            open_config_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // App exited (tray Quit).
    PUMP_RUNNING.store(false, Ordering::SeqCst);
    mobile::stop();
    controller::stop();
    vigem::shutdown();
}
