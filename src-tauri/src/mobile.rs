//! Full LAN remote: status, config, rumble, macros, driver actions — all behind a bearer token.
//! Page is served from `src-tauri/remote/index.html` via `include_str!`.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU8, Ordering};
use std::thread;
use std::time::Duration;

use crate::{emit_config_changed, config::AppConfig};

static RUNNING: AtomicBool = AtomicBool::new(false);
static PORT: AtomicU16 = AtomicU16::new(9090);
static RUMBLE_STRENGTH: AtomicU8 = AtomicU8::new(100);
static TOKEN: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

fn gen_token() -> String {
    use std::sync::atomic::AtomicU64;
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{:x}{:x}", std::process::id(), n)
}

pub fn set_token(t: String) {
    *TOKEN.lock().unwrap() = Some(t);
}

pub fn get_token() -> Option<String> {
    TOKEN.lock().unwrap().clone()
}

pub fn is_running() -> bool {
    RUNNING.load(Ordering::SeqCst)
}

pub fn port() -> u16 {
    PORT.load(Ordering::SeqCst)
}

/// Returns true if the mobile service should be running based on config.
/// Call this after any config change to keep the server in sync.
pub fn reconcile_mobile(cfg: &AppConfig) {
    let should_run = cfg.mobile.enabled;
    let is_running = RUNNING.load(Ordering::SeqCst);
    let current_port = PORT.load(Ordering::SeqCst);

    if should_run && !is_running {
        // Try to start up to 5 times (50ms apart) to handle stop/start race
        for _ in 0..5 {
            if start(cfg.mobile.port).is_ok() {
                break;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    } else if !should_run && is_running {
        stop();
    } else if should_run && is_running && current_port != cfg.mobile.port {
        // Port changed while running — restart on new port
        stop();
        for _ in 0..5 {
            if start(cfg.mobile.port).is_ok() {
                break;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    }
}

pub fn set_rumble_strength(strength: u8) {
    RUMBLE_STRENGTH.store(strength.min(100), Ordering::SeqCst);
}

pub fn start(port: u16) -> Result<(), String> {
    if RUNNING.load(Ordering::SeqCst) {
        return Ok(());
    }
    let listener = TcpListener::bind(("0.0.0.0", port))
        .map_err(|e| format!("Port {} unavailable: {}", port, e))?;
    PORT.store(port, Ordering::SeqCst);

    // generate token on start
    set_token(gen_token());

    RUNNING.store(true, Ordering::SeqCst);

    // Windows Firewall drops unsolicited inbound traffic, so the phone on the LAN
    // would see nothing at all. Open the port (UAC the first time, rule is kept).
    // Background thread: the UAC wait must not stall a config apply.
    thread::spawn(move || {
        let _ = crate::drivers::ensure_firewall_rule(port);
    });

    thread::spawn(move || {
        for stream in listener.incoming() {
            if !RUNNING.load(Ordering::SeqCst) {
                break;
            }
            if let Ok(s) = stream {
                thread::spawn(move || handle(s));
            }
        }
    });
    Ok(())
}

pub fn stop() {
    if RUNNING.swap(false, Ordering::SeqCst) {
        // poke the accept loop so it wakes up and sees the flag
        let _ = TcpStream::connect(("127.0.0.1", PORT.load(Ordering::SeqCst)));
    }
}

struct Request {
    method: String,
    path: String,
    headers: String,
    body: Vec<u8>,
}

fn read_request(stream: &mut TcpStream) -> Option<Request> {
    // Read headers first (until \r\n\r\n)
    let mut header_buf = Vec::new();
    let mut tmp = [0u8; 1];
    loop {
        match stream.read_exact(&mut tmp) {
            Ok(()) => {
                header_buf.push(tmp[0]);
                if header_buf.len() >= 4 {
                    let end = header_buf.len() - 4;
                    if &header_buf[end..] == b"\r\n\r\n" {
                        break;
                    }
                }
            }
            Err(_) => return None,
        }
    }
    let header_str = String::from_utf8_lossy(&header_buf).to_string();
    let lines: Vec<&str> = header_str.lines().collect();
    if lines.is_empty() {
        return None;
    }
    let request_line = lines[0];
    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return None;
    }
    let method = parts[0].to_string();
    let path = parts[1].split('?').next().unwrap_or("/").to_string();

    // Find Content-Length
    let mut content_length = 0usize;
    for line in &lines[1..] {
        if let Some(val) = line.strip_prefix("Content-Length:") {
            content_length = val.trim().parse().unwrap_or(0);
        }
    }

    // Read body
    let mut body = vec![0u8; content_length];
    if content_length > 0 {
        stream.read_exact(&mut body).ok()?;
    }

    Some(Request {
        method,
        path,
        headers: header_str,
        body,
    })
}

fn write_response(stream: &mut TcpStream, status: &str, ctype: &str, body: &[u8]) {
    let resp = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        status,
        ctype,
        body.len()
    );
    let _ = stream.write_all(resp.as_bytes());
    let _ = stream.write_all(body);
}

fn check_auth(headers: &str) -> bool {
    let expected = match get_token() {
        Some(t) => t,
        None => return false,
    };
    for line in headers.lines() {
        if let Some(val) = line.strip_prefix("Authorization:") {
            let val = val.trim();
            if val == format!("Bearer {}", expected) {
                return true;
            }
        }
    }
    false
}

fn json_response(status: &str, body: &str) -> (String, String, Vec<u8>) {
    (status.to_string(), "application/json".to_string(), body.as_bytes().to_vec())
}

fn handle(mut stream: TcpStream) -> (String, String, Vec<u8>) {
    let Some(req) = read_request(&mut stream) else {
        return ("400 Bad Request".to_string(), "text/plain".to_string(), b"bad request".to_vec());
    };

    // Serve the HTML page without auth
    if req.method == "GET" && (req.path == "/" || req.path == "/index.html") {
        let html = include_str!("../remote/index.html");
        write_response(&mut stream, "200 OK", "text/html; charset=utf-8", html.as_bytes());
        return ("200 OK".to_string(), "text/html".to_string(), vec![]);
    }

    // Route handlers
    let (status, ctype, body) = match (&req.method[..], &req.path[..]) {
        // Public read-only
        ("GET", "/api/status") => {
            let devices = crate::controller::device_infos();
            let count = devices.len();
            let connection = if count > 0 { "connected" } else { "disconnected" };
            let battery = devices.iter().map(|d| d.battery).filter(|b| *b >= 0).min().unwrap_or(-1);
            let status_obj = crate::controller::build_status();
            json_response(
                "200 OK",
                &serde_json::json!({
                    "controller": status_obj.controller,
                    "battery": status_obj.battery,
                    "connection": status_obj.connection,
                    "deviceCount": status_obj.device_count,
                    "localIp": status_obj.local_ip,
                    "port": PORT.load(Ordering::SeqCst),
                    "vigemBus": status_obj.vigem_bus,
                    "hidHide": status_obj.hid_hide,
                    "driverCore": status_obj.driver_core,
                    "mobileService": status_obj.mobile_service,
                }).to_string(),
            )
        }
        ("GET", "/api/config") => {
            let cfg = crate::config::load_config();
            json_response("200 OK", &serde_json::to_string(&cfg).unwrap_or_default())
        }

        // Authenticated mutating endpoints
        ("POST", "/api/config") if check_auth(&req.headers) => {
            let cfg: crate::config::AppConfig = match serde_json::from_slice(&req.body) {
                Ok(c) => c,
                Err(_) => {
                    return json_response("400 Bad Request", "{\"error\":\"invalid json\"}");
                }
            };
            match crate::config::save_config(&cfg) {
                Ok(()) => {
                    // Apply to running systems
                    let warnings = crate::controller::apply_config(&cfg);
                    crate::mobile::set_rumble_strength(cfg.vibration.strength);
                    crate::drivers::set_run_on_startup(cfg.system.run_on_startup).ok();
                    if cfg.mobile.enabled {
                        if !crate::mobile::is_running() {
                            crate::mobile::start(cfg.mobile.port).ok();
                        }
                    } else {
                        crate::mobile::stop();
                    }
                    // Emit to UI so the desktop app syncs
                    emit_config_changed(&cfg);
                    json_response("200 OK", &serde_json::json!({ "ok": true, "warnings": warnings }).to_string())
                }
                Err(e) => json_response("500 Internal Server Error", &format!("{{\"error\":{:?}}}", e)),
            }
        }
        ("POST", "/api/rumble") if check_auth(&req.headers) => {
            let strength: u8 = serde_json::from_slice(&req.body)
                .ok()
                .and_then(|v: serde_json::Value| v.get("strength").and_then(|s| s.as_u64()).map(|s| s as u8))
                .unwrap_or_else(|| RUMBLE_STRENGTH.load(Ordering::SeqCst));
            match crate::controller::test_rumble(strength) {
                Ok(()) => json_response("200 OK", "{\"ok\":true}"),
                Err(e) => json_response("200 OK", &format!("{{\"ok\":false,\"error\":{:?}}}", e)),
            }
        }
        ("POST", path) if check_auth(&req.headers) && path.starts_with("/api/macro/") => {
            let id = path.strip_prefix("/api/macro/").unwrap_or("");
            let cfg = crate::config::load_config();
            match crate::controller::run_macro(&cfg, id) {
                Ok(()) => json_response("200 OK", "{\"ok\":true}"),
                Err(e) => json_response("200 OK", &format!("{{\"ok\":false,\"error\":{:?}}}", e)),
            }
        }
        ("POST", path) if check_auth(&req.headers) && path.starts_with("/api/driver/") => {
            let rest = path.strip_prefix("/api/driver/").unwrap_or("");
            let parts: Vec<&str> = rest.split('/').collect();
            if parts.len() == 2 {
                let name = parts[0];
                let action = parts[1];
                let cfg = crate::config::load_config();
                match crate::drivers::driver_action(name, action, &cfg) {
                    Ok(msg) => json_response("200 OK", &format!("{{\"ok\":true,\"message\":{:?}}}", msg)),
                    Err(e) => json_response("200 OK", &format!("{{\"ok\":false,\"error\":{:?}}}", e)),
                }
            } else {
                json_response("400 Bad Request", "{\"error\":\"invalid driver path\"}")
            }
        }

        // 405 for wrong method on known paths
        (_, "/api/status") | (_, "/api/config") | (_, "/api/rumble") => {
            json_response("405 Method Not Allowed", "{\"error\":\"method not allowed\"}")
        }
        _ if req.path.starts_with("/api/macro/") || req.path.starts_with("/api/driver/") => {
            json_response("405 Method Not Allowed", "{\"error\":\"method not allowed\"}")
        }

        // Not found
        _ => ("404 Not Found".to_string(), "text/plain".to_string(), b"not found".to_vec()),
    };

    write_response(&mut stream, &status, &ctype, &body);
    (status, ctype, body)
}