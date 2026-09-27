# Stadia Manager

[English](readme-en.md) · [فارسی](readme-fa.md) · [Русский](readme-ru.md)

> Google Stadia controller → Xbox 360 virtual controller manager for Windows

![Button Mapping](docs/button-mapping.png)

**Stadia Manager** is a native Windows desktop app (Tauri v2) that keeps a Google
Stadia controller alive after Stadia's shutdown: it reads the pad through a C engine,
lets you remap all 19 inputs on a photo of the controller, and feeds games a standard
**Xbox 360** virtual pad through ViGEmBus.

- **System Status** — live ViGEmBus / HidHide status, battery, connection type, one-click driver install
- **Button Mapping** — photo hotspots, three modes per button (xinput · app · shortcut), deadzones
- **Macros** — multi-step `press`/`wait` macros, one-click playback
- **Vibration** — rumble test and strength (USB only; Windows can't rumble over Bluetooth)
- **Remote Access** — small HTTP server (port `9090`) for status and rumble from your phone
- **Themes** — five color themes, tray icon with Show / Refresh / Quit

## Full documentation

| | |
| --- | --- |
| 🇬🇧 English | [readme-en.md](readme-en.md) |
| 🇮🇷 فارسی | [readme-fa.md](readme-fa.md) |
| 🇷🇺 Русский | [readme-ru.md](readme-ru.md) |

## Quick start

```bash
npm install

# UI only: http://localhost:1420
npm run dev

# full desktop app (C engine + ViGEm)
cargo tauri dev
```

## Releases

Releases are built **only** by GitHub Actions on `windows-latest` — never locally.
Push to `main` (or run the workflow manually) and the **Build Windows Release**
workflow publishes the `.msi` and `.exe` installers.

## License

[Apache-2.0](LICENSE)
