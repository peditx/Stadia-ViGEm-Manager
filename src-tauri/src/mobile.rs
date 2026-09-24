//! Minimal LAN remote: status JSON + rumble trigger for phones on the same network.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU8, Ordering};
use std::thread;

static RUNNING: AtomicBool = AtomicBool::new(false);
static PORT: AtomicU16 = AtomicU16::new(9090);
static RUMBLE_STRENGTH: AtomicU8 = AtomicU8::new(100);

pub fn is_running() -> bool {
    RUNNING.load(Ordering::SeqCst)
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
    RUNNING.store(true, Ordering::SeqCst);

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

fn handle(mut stream: TcpStream) {
    let mut buf = [0u8; 2048];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let req = String::from_utf8_lossy(&buf[..n]);
    let mut parts = req.split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/").split('?').next().unwrap_or("/");

    let (status, ctype, body) = match (method, path) {
        ("GET", "/api/status") => {
            let count = crate::controller::device_infos().len();
            let connection = if count > 0 { "connected" } else { "disconnected" };
            (
                "200 OK",
                "application/json",
                format!("{{\"deviceCount\":{},\"connection\":\"{}\"}}", count, connection),
            )
        }
        ("POST", "/api/rumble") => {
            let strength = RUMBLE_STRENGTH.load(Ordering::SeqCst);
            match crate::controller::test_rumble(strength) {
                Ok(()) => ("200 OK", "application/json", "{\"ok\":true}".to_string()),
                Err(e) => (
                    "200 OK",
                    "application/json",
                    format!("{{\"ok\":false,\"error\":{:?}}}", e),
                ),
            }
        }
        ("GET", "/") => ("200 OK", "text/html; charset=utf-8", PAGE.to_string()),
        _ => ("404 Not Found", "text/plain", "not found".to_string()),
    };

    let resp = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        ctype,
        body.len(),
        body
    );
    let _ = stream.write_all(resp.as_bytes());
}

const PAGE: &str = r#"<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stadia Remote</title><style>body{margin:0;font-family:system-ui;background:#0b0c10;color:#e5e7eb;display:flex;min-height:100vh;align-items:center;justify-content:center}.c{width:280px;background:#15171c;border:1px solid #ffffff1a;border-radius:16px;padding:24px;text-align:center}h1{font-size:16px;margin:0 0 4px}.s{font-size:12px;color:#9ca3af;margin-bottom:16px}button{width:100%;padding:14px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;font-size:14px}button:active{opacity:.7}#m{margin-top:10px;font-size:11px;color:#f87171;min-height:14px}</style></head><body><div class="c"><h1>Stadia Remote</h1><div class="s" id="st">connecting...</div><button onclick="r()">RUMBLE</button><div id="m"></div></div><script>async function p(){try{const res=await fetch('/api/status');const j=await res.json();document.getElementById('st').textContent=j.connection==='connected'?('Connected · '+j.deviceCount+' pad(s)'):'No controller';}catch(e){document.getElementById('st').textContent='Disconnected';}}async function r(){try{const res=await fetch('/api/rumble',{method:'POST'});const j=await res.json();document.getElementById('m').textContent=j.ok?'Bzzt!':(j.error||'Failed');}catch(e){document.getElementById('m').textContent='Failed';}}p();setInterval(p,2000);</script></body></html>"#;
