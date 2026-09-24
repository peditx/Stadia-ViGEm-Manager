//! ViGEmBus integration via the pure-Rust `vigem-client` crate.
//! One Xbox 360 wired target per physical Stadia controller.

use crate::controller::X360Report;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use vigem_client::{Client, TargetId, XButtons, XGamepad, Xbox360Wired};

type Target = Xbox360Wired<Arc<Client>>;

static BUS: Mutex<Option<Arc<Client>>> = Mutex::new(None);
static TARGETS: Mutex<Option<HashMap<u64, (Target, JoinHandle<()>)>>> = Mutex::new(None);

fn err(e: impl std::fmt::Debug) -> String {
    format!("{:?}", e)
}

/// Connect to the ViGEmBus driver (idempotent).
pub fn init() -> Result<(), String> {
    let mut bus = BUS.lock().unwrap();
    if bus.is_none() {
        let client = Client::connect().map_err(err)?;
        *bus = Some(Arc::new(client));
    }
    Ok(())
}

pub fn connected() -> bool {
    BUS.lock().unwrap().is_some()
}

pub fn add_target(id: u64) -> Result<(), String> {
    let client = {
        let bus = BUS.lock().unwrap();
        match bus.as_ref() {
            Some(c) => c.clone(),
            None => {
                // Bus may have been installed after startup — try once.
                drop(bus);
                init()?;
                BUS.lock().unwrap().clone().ok_or("ViGEmBus not connected")?
            }
        }
    };

    let mut guard = TARGETS.lock().unwrap();
    let map = guard.get_or_insert_with(HashMap::new);
    if map.contains_key(&id) {
        return Ok(());
    }

    let mut target = Xbox360Wired::new(client, TargetId::XBOX360_WIRED);
    target.plugin().map_err(err)?;
    target.wait_ready().map_err(err)?;

    let mut notification = target.request_notification().map_err(err)?;
    let handle = notification.spawn_thread(move |_req, n| {
        crate::controller::notify_rumble_from_bus(id, n.large_motor, n.small_motor);
    });

    map.insert(id, (target, handle));
    Ok(())
}

pub fn remove_target(id: u64) {
    let removed = {
        let mut guard = TARGETS.lock().unwrap();
        guard.as_mut().and_then(|m| m.remove(&id))
    };
    if let Some((target, handle)) = removed {
        drop(target); // unplugs the virtual pad
        let _ = handle.join(); // notification loop exits with OperationAborted
    }
}

pub fn push(id: u64, r: &X360Report) {
    let mut guard = TARGETS.lock().unwrap();
    let Some(map) = guard.as_mut() else { return };
    let Some((target, _)) = map.get_mut(&id) else { return };

    let gamepad = XGamepad {
        buttons: XButtons::from(r.buttons),
        left_trigger: r.lt,
        right_trigger: r.rt,
        thumb_lx: r.lx,
        thumb_ly: r.ly,
        thumb_rx: r.rx,
        thumb_ry: r.ry,
    };
    // TargetNotReady / transient bus errors: next report (≤16ms) will land.
    let _ = target.update(&gamepad);
}

pub fn shutdown() {
    let taken = {
        let mut guard = TARGETS.lock().unwrap();
        guard.take()
    };
    if let Some(map) = taken {
        for (_, (target, handle)) in map {
            drop(target);
            let _ = handle.join();
        }
    }
    *BUS.lock().unwrap() = None;
}
