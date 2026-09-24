# Stadia ViGEm Manager

> Google Stadia controller → Xbox 360/DS4 virtual controller manager

A modern Tauri desktop app for managing your Google Stadia controller with ViGEm bus driver. Configure button mapping, macros, vibration, deadzones, and more.

## Features

- **Controller Detection** — Auto-detects USB and Bluetooth Stadia controllers
- **ViGEm Integration** — Maps to Xbox 360 or DualShock 4 virtual controller
- **Button Remapping** — Full keybind editor with visual SVG controller schematic
- **Macro Engine** — Record and playback custom macros
- **Vibration Control** — Test and configure force feedback
- **Deadzone Adjustment** — Per-stick deadzone configuration
- **Driver Management** — Install/uninstall ViGEmBus and HidHide drivers
- **Mobile Remote** — Control settings from your phone
- **Theme System** — 5 color themes (Blue, Cyan, Orange, Purple, Green)

## Tech Stack

- **Backend:** C (HID engine: libstadia + engine) via FFI, driven by Rust (Tauri v2 + vigem-client)
- **Frontend:** React + TypeScript + Tailwind CSS
- **Build:** GitHub Actions CI → Windows .exe/.msi (never built locally)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable)
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
npm install
cargo tauri dev
```

### Build

```bash
cargo tauri build
```

Output: `src-tauri/target/release/bundle/`

## CI/CD

GitHub Actions automatically builds Windows releases on push to main.

## License

Apache-2.0
