# Changelog

All notable changes to Cream Corners are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-17

First public release. A hot corners app for Windows 10/11 x64, built with Rust + Tauri 2 and a TypeScript/Vite UI.

### Added

- Eight configurable zones: four corners and four edges, each with its own enabled flag, action, dwell override and size.
- Seventeen ready-to-assign Windows presets, including Task View, show desktop, lock, Task Manager, Settings and File Explorer.
- External command actions with a program and a separate argument list, without a shell.
- URL actions with the `http`, `https`, `ms-` and `shell:` schemes.
- Global dwell (0–3000 ms, 220 default) with a per-zone override.
- Global cooldown (0–10000 ms, 800 default) to stop re-triggering when the cursor returns to a zone.
- Adjustable zone size: corners 1–64 px (6 default) and edges 1–32 px (4 default).
- Cursor polling interval configurable between 15 and 500 ms (40 default).
- Drag suppression: no action fires while a mouse button is held.
- Automatic pause when a fullscreen app is in the foreground, so games, video and presentations are not disturbed; shell windows are excluded.
- Multi-monitor scope: all displays or the primary one only.
- Versioned configuration with atomic writes, automatic backup (`settings.bak.json`) and quarantine of corrupt files (`settings.corrupt-<epoch>.json`).
- System tray icon with an **Active** check item, an entry to open the window and **Exit**.
- Single instance: a second launch of the executable raises the existing window through the named event `Local\CreamCornersShow`.
- Optional start with Windows, through the `CreamCorners` value under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- NSIS (`Cream Corners_0.1.0_x64-setup.exe`) and WiX/MSI (`Cream Corners_0.1.0_x64_en-US.msi`) installers, both per-machine and both attached to release `v0.1.0`.

### Changed

- Closing the window no longer ends the process: the app hides in the tray and reopens from a left click or the tray menu.
- The tray menu entry is named **Change commands** and keeps its state in sync with the window in both directions.
- Settings live in `%APPDATA%\CreamCorners\settings.json` instead of paths relative to the executable.
- Status events sent to the UI report the real configuration path (`configPath`) of the running instance.

### Fixed

- Desynchronization between the tray **Active** check and the window switch.
- Spurious trigger when dropping a dragged window over a corner or edge.
- Race between consecutive autosaves that could leave the temporary file half written.
- Tray icon lifecycle: it was recreated or orphaned when toggling state and when restarting the window.
- Missing or stale configuration path in the status events sent to the UI.
- Incomplete suppression of the X1/X2 side buttons during drag detection.

### Known limitations

- Windows x64 only; no ARM64 or other platform build.
- Detection polls the cursor instead of using a mouse hook, so latency is roughly the polling interval (40 ms by default).
- Keyboard actions use `keybd_event`; elevated applications may ignore them because of UIPI.
- Not per-monitor DPI aware: with different scales per monitor the zones can be offset.
- The installers are not digitally signed, so SmartScreen may warn. There is no auto-update.
- The interface is Spanish-only.
- On the development machine, running the executable from a folder under Documents makes configuration writes fail with "Access denied" because of local policy; the installed copy under Program Files works.
- Verified on the development machine: `cargo check`, `npm run build`, `npm run tauri build`, UI rendering, and Task View firing when the cursor rests in the top-left corner. Not tested on every hardware or system configuration.

[0.1.0]: https://github.com/Canopus44/cream-corners/releases/tag/v0.1.0
