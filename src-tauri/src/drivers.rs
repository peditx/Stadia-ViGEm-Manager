//! Driver install/uninstall, startup registry entry, small system helpers.

use crate::config::AppConfig;
use crate::{controller, mobile, vigem};
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Command, Output};

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// Verified reachable (HTTP 200) at the time of writing.
const VIGEM_URL: &str =
    "https://github.com/nefarius/ViGEmBus/releases/download/v1.22.0/ViGEmBus_1.22.0_x64_x86_arm64.exe";
const HIDHIDE_URL: &str =
    "https://github.com/nefarius/HidHide/releases/download/v1.5.230.0/HidHide_1.5.230_x64.exe";

const WINGET_VIGEM: &str = "ViGEm.ViGEmBus";
const WINGET_HIDHIDE: &str = "Nefarius.HidHide";

fn run_hidden(program: &str, args: &[&str]) -> std::io::Result<Output> {
    Command::new(program).args(args).creation_flags(CREATE_NO_WINDOW).output()
}

fn out_err(out: &Output) -> String {
    let stderr = String::from_utf8_lossy(&out.stderr);
    let stdout = String::from_utf8_lossy(&out.stdout);
    let msg = if stderr.trim().is_empty() { stdout } else { stderr };
    msg.trim().to_string()
}

pub fn service_installed(service: &str) -> bool {
    run_hidden("sc", &["query", service]).map(|o| o.status.success()).unwrap_or(false)
}

pub fn vigem_installed() -> bool {
    service_installed("ViGEmBus")
}

pub fn hidhide_installed() -> bool {
    service_installed("HidHide")
}

fn winget_available() -> bool {
    run_hidden("winget", &["--version"]).map(|o| o.status.success()).unwrap_or(false)
}

fn winget(id: &str, uninstall: bool) -> Result<String, String> {
    let verb = if uninstall { "uninstall" } else { "install" };
    let out = run_hidden(
        "winget",
        &[
            verb,
            "--id",
            id,
            "-e",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--disable-interactivity",
        ],
    )
    .map_err(|e: std::io::Error| e.to_string())?;
    if out.status.success() {
        Ok(format!("{}ed {} via winget", verb, id))
    } else {
        Err(out_err(&out))
    }
}

fn download(url: &str, dest: &Path) -> Result<(), String> {
    let dest_s = dest.to_string_lossy().to_string();
    let out = run_hidden(
        "curl",
        &["-L", "--fail", "--max-time", "180", "-o", &dest_s, url],
    )
    .map_err(|e| format!("curl is not available: {}", e))?;
    if out.status.success() {
        Ok(())
    } else {
        Err(format!("Download failed: {}", out_err(&out)))
    }
}

/// Launch `path` elevated (UAC prompt) and wait for it to finish.
/// Returns the process exit code.
fn run_elevated(path: &str, params: &str) -> Result<u32, String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_CANCELLED};
    use windows_sys::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject};
    use windows_sys::Win32::UI::Shell::{
        ShellExecuteExW, SHELLEXECUTEINFOW, SEE_MASK_NOCLOSEPROCESS,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    fn wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
    }

    let verb = wide("runas");
    let file = wide(path);
    let params = wide(params);

    unsafe {
        let mut info: SHELLEXECUTEINFOW = std::mem::zeroed();
        info.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
        info.fMask = SEE_MASK_NOCLOSEPROCESS;
        info.lpVerb = verb.as_ptr();
        info.lpFile = file.as_ptr();
        info.lpParameters = params.as_ptr();
        info.nShow = SW_SHOWNORMAL as i32;

        if ShellExecuteExW(&mut info) == 0 {
            let e = GetLastError();
            if e == ERROR_CANCELLED {
                return Err("UAC prompt was cancelled".into());
            }
            return Err(format!("Could not launch elevated process (WinError {})", e));
        }

        let mut code: u32 = 1;
        if !info.hProcess.is_null() {
            WaitForSingleObject(info.hProcess, 10 * 60 * 1000);
            GetExitCodeProcess(info.hProcess, &mut code);
            CloseHandle(info.hProcess);
        }
        Ok(code)
    }
}

// ------------------------- ViGEmBus -------------------------

fn install_vigem() -> Result<String, String> {
    if vigem_installed() {
        return Ok("ViGEmBus is already installed".into());
    }
    if winget_available() {
        if let Ok(msg) = winget(WINGET_VIGEM, false) {
            return Ok(msg);
        }
    }
    let dest = std::env::temp_dir().join("ViGEmBus-setup.exe");
    download(VIGEM_URL, &dest)?;
    let code = run_elevated(&dest.to_string_lossy(), "/quiet /norestart")?;
    if code == 0 {
        Ok("ViGEmBus installed".into())
    } else {
        Err(format!("ViGEmBus installer exited with code {}", code))
    }
}

fn uninstall_vigem() -> Result<String, String> {
    if winget_available() {
        if let Ok(msg) = winget(WINGET_VIGEM, true) {
            return Ok(msg);
        }
    }
    // Fallback: the WiX burn installer understands /uninstall.
    let dest = std::env::temp_dir().join("ViGEmBus-setup.exe");
    if !dest.exists() {
        download(VIGEM_URL, &dest)?;
    }
    let code = run_elevated(&dest.to_string_lossy(), "/uninstall /quiet /norestart")?;
    if code == 0 {
        Ok("ViGEmBus uninstalled".into())
    } else {
        Err(format!("ViGEmBus uninstaller exited with code {}", code))
    }
}

// ------------------------- HidHide -------------------------

fn install_hidhide() -> Result<String, String> {
    if hidhide_installed() {
        return Ok("HidHide is already installed".into());
    }
    if winget_available() {
        if let Ok(msg) = winget(WINGET_HIDHIDE, false) {
            return Ok(msg);
        }
    }
    // No documented silent flags we can trust — run the installer interactively.
    let dest = std::env::temp_dir().join("HidHide-setup.exe");
    download(HIDHIDE_URL, &dest)?;
    run_elevated(&dest.to_string_lossy(), "")?;
    Ok("HidHide installer launched — complete its setup window".into())
}

fn uninstall_hidhide() -> Result<String, String> {
    if winget_available() {
        if let Ok(msg) = winget(WINGET_HIDHIDE, true) {
            return Ok(msg);
        }
    }
    Err("Winget is unavailable — remove HidHide from Windows Settings > Apps".into())
}

// ------------------------- Dispatcher -------------------------

pub fn driver_action(name: &str, action: &str, cfg: &AppConfig) -> Result<String, String> {
    match name {
        "vigemBus" => match action {
            "install" => install_vigem(),
            "reinstall" => {
                controller::stop();
                vigem::shutdown();
                if vigem_installed() {
                    uninstall_vigem()?;
                }
                let msg = install_vigem()?;
                vigem::init().ok();
                controller::start();
                controller::apply_config(cfg);
                Ok(msg)
            }
            "uninstall" => {
                controller::stop();
                vigem::shutdown();
                uninstall_vigem()
            }
            other => Err(format!("Unknown action: {}", other)),
        },
        "hidHide" => match action {
            "install" => install_hidhide(),
            "reinstall" => {
                if hidhide_installed() {
                    uninstall_hidhide()?;
                }
                install_hidhide()
            }
            "uninstall" => uninstall_hidhide(),
            other => Err(format!("Unknown action: {}", other)),
        },
        "driverCore" => match action {
            "uninstall" => {
                controller::stop();
                vigem::shutdown();
                Ok("Controller service stopped".into())
            }
            "install" | "reinstall" => {
                vigem::init().map_err(|e| {
                    format!("{} — install the ViGEmBus driver first", e)
                })?;
                controller::start();
                controller::apply_config(cfg);
                Ok("Controller service started".into())
            }
            other => Err(format!("Unknown action: {}", other)),
        },
        "mobileService" => match action {
            "install" | "reinstall" => {
                if mobile::is_running() {
                    mobile::stop();
                }
                mobile::set_rumble_strength(cfg.vibration.strength);
                mobile::start(cfg.mobile.port)?;
                Ok(format!("Mobile bridge listening on port {}", cfg.mobile.port))
            }
            "uninstall" => {
                mobile::stop();
                Ok("Mobile bridge stopped".into())
            }
            other => Err(format!("Unknown action: {}", other)),
        },
        other => Err(format!("Unknown component: {}", other)),
    }
}

// ------------------------- Helpers -------------------------

pub fn set_run_on_startup(enabled: bool) -> Result<(), String> {
    const KEY: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
    const VALUE: &str = "StadiaViGEmManager";

    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let cmd = format!("\"{}\"", exe.display());
        let out = run_hidden("reg", &["add", KEY, "/v", VALUE, "/t", "REG_SZ", "/d", &cmd, "/f"])
            .map_err(|e| e.to_string())?;
        if out.status.success() {
            Ok(())
        } else {
            Err(out_err(&out))
        }
    } else {
        // Deleting a missing value fails — that is already the desired state.
        run_hidden("reg", &["delete", KEY, "/v", VALUE, "/f"]).ok();
        Ok(())
    }
}

pub fn open_folder(path: &str) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn local_ip() -> String {
    std::net::UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}
