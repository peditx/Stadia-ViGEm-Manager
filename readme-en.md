# Stadia Manager

**English** · [فارسی](readme-fa.md) · [Русский](readme-ru.md)

> Google Stadia controller → Xbox 360 virtual controller manager for Windows

![Button Mapping](docs/button-mapping.png)

## Overview

**Stadia Manager** is a native Windows desktop application (Tauri v2) that keeps a
Google Stadia controller usable after Stadia's shutdown. It reads the real controller
through a small C engine, lets you remap every button, and forwards the input to games
as a standard **Xbox 360** virtual pad through the ViGEmBus driver — so any game that
supports an Xbox pad just works, with no per-game configuration.

It is a real desktop app: a signed `.msi`/`.exe` window with a system tray icon, not a
web page wrapped in a shell.

## Features

| Section | What it does |
| --- | --- |
| **System Status** | Live status of ViGEmBus, HidHide, driver core, mobile service, battery, connection type (USB/Bluetooth) and device count. One-click install/uninstall for the drivers. |
| **Button Mapping** | Remap all 19 inputs on a photo of the controller, with three binding modes per button. |
| **Macros** | Record multi-step macros (`press` / `wait` steps) and run them with a single click. |
| **Vibration** | Test rumble and set the global vibration strength. |
| **Remote Access** | Runs a tiny HTTP server (default port `9090`) so your phone can show status and trigger rumble. |
| **Themes** | Five color themes (green, blue, cyan, orange, purple). |
| **Tray** | Closing the window hides it to the tray; quit from the tray menu. |

## Button Mapping

![Button Mapping](docs/button-mapping.png)

The mapping screen shows a photo of your controller with a hotspot chip on every
button (19 in total: face buttons, D-pad, bumpers, triggers, stick clicks, Stadia,
Assistant, Capture, Options and Menu). Hovering a row in the list highlights the chip
on the photo, and vice versa, so you always know which physical button you are editing.

Every button has three binding modes:

- **xinput** — send it to the virtual Xbox 360 pad as `A`, `B`, `X`, `Y`, `Start`,
  `Back`, `Guide`, `LB`/`RB`, `LT`/`RT`, stick clicks or D-pad directions. This is the
  default and what most games read.
- **app** — launch a program (a full path such as `C:\Games\game.exe`) instead of
  sending a pad input.
- **shortcut** — record a keyboard shortcut (for example `Win + Shift + S`) and send it
  when the button is pressed. Useful for Steam overlay, screenshots, and system keys.

Below the photo you get per-stick **deadzone** sliders (left, right, and trigger
deadzone), which are written into the virtual pad report before it reaches the game.

## How it works

```
Stadia controller (USB / Bluetooth)
        │  HID reports
        ▼
libstadia  (C engine: src-tauri/csrc/libstadia)
        │  device discovery, input reports, rumble callbacks
        ▼
Rust / Tauri core  (src-tauri/src)
        │  mapping + macros + config + drivers + tray + remote HTTP
        ▼
ViGEmBus driver  →  virtual Xbox 360 pad  →  games
```

- The C engine (`hid.c`, `stadia.c`, `engine.c`, `utils.c`) is compiled by the `cc`
  crate in `build.rs` on Windows and talks to the controller over HID.
- The Rust layer maps each report according to `config.json`, plays macros, drives the
  virtual pad with `vigem-client`, and exposes Tauri commands to the UI.
- The UI is React + TypeScript + Tailwind; it polls `get_status` every 2 seconds.

### Vibration

Rumble works over **USB only**. Windows cannot send output reports to a Stadia
controller over Bluetooth, so the app refuses and tells you to plug the controller in
instead of pretending it worked.

### Drivers

The app installs the two drivers the setup needs:

- [ViGEmBus](https://github.com/nefarius/ViGEmBus) — the virtual Xbox 360 pad
- [HidHide](https://github.com/nefarius/HidHide) — hides the real controller from games
  so inputs are not received twice

Installation prefers `winget` (`ViGEm.ViGEmBus`, `Nefarius.HidHide`) and falls back to
the official installer download; both elevate through UAC.

## Configuration

Settings live in `config.json` next to the executable (the path is shown in the sidebar
and can be opened from the app). Example:

```json
{
  "system": { "runOnStartup": true },
  "vibration": { "strength": 100 },
  "deadzones": { "left": 10, "right": 10, "triggers": 5 },
  "mobile": { "enabled": false, "port": 9090 },
  "macrosEnabled": true,
  "keybinds": {
    "faceA":   { "mode": "xinput",   "value": "A",           "label": "Face A" },
    "captureBtn": { "mode": "shortcut", "value": "Win + Shift + S", "label": "Capture" },
    "stadiaBtn":  { "mode": "xinput",   "value": "Guide",      "label": "Stadia" }
  },
  "macros": [
    { "id": "rapid", "name": "Rapid Fire", "steps": [
      { "type": "press", "key": "RT", "ms": 50 },
      { "type": "wait",  "ms": 50 } ] }
  ]
}
```

## Requirements

- Windows 10/11 x64
- A Google Stadia controller (USB cable or Bluetooth pairing)
- ViGEmBus + HidHide (installed by the app)

## Development

Prerequisites: [Node.js](https://nodejs.org/) 20+, [Rust](https://rustup.rs/) stable,
and the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
npm install

# UI only (fast, no Rust): http://localhost:1420
npm run dev

# Full desktop app with the C engine and ViGEm
cargo tauri dev
```

Useful checks before committing:

```bash
npx tsc --noEmit   # type check
npm run build      # production frontend bundle
```

### Project layout

```
public/controller.png        controller photo used by the mapping hotspots
src/                         React UI (components/, lib/)
src-tauri/csrc/libstadia/    C engine — HID access, device state, rumble
src-tauri/src/               Rust core — config, drivers, vigem, macros, tray, remote
src-tauri/build.rs           compiles the C engine with the cc crate
.github/workflows/build.yml  Windows release build
```

## Building releases

Releases are **never built locally**. Push to `main` (or run the workflow manually) and
GitHub Actions builds on `windows-latest`, publishing the `.msi` and `.exe`
installers from the **Build Windows Release** workflow.

> If Actions is disabled on your account, enable it under
> *Settings → Actions → General* first — otherwise the workflow will not start.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "No bus" in the header | Install ViGEmBus from *System Status*. |
| Controller not detected | Replug over USB, press the Stadia button, then hit *Refresh devices*. |
| Rumble error mentioning Bluetooth | Expected — connect the controller by USB. |
| Input reaches the game twice | Enable HidHide so the physical pad is hidden from games. |
| Ports in use | The remote server port is configurable (default `9090`). |

## Related

- [stadia-vigem](https://github.com/peditx/stadia-vigem) — the companion C driver work

## License

[Apache-2.0](LICENSE)
