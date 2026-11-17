[English](troubleshooting.md) · [Español](es/solucion-de-problemas.md)

# Troubleshooting

## 1. The build fails with `link.exe not found`

**Likely cause**: the MSVC linker is missing. Rust uses the MSVC toolchain on Windows.

**Fix**: install Visual Studio Build Tools with the "Desktop development with C++" workload (it brings MSVC v143 and the Windows SDK), open a new terminal and rerun `npm run tauri build`. Check with `rustup show` that the active toolchain is `stable-x86_64-pc-windows-msvc`.

## 2. The app does not react to a corner or edge

**Likely cause**: the global switch is off, a fullscreen app is running, the zone is disabled, or the dwell is too long.

**Fix**, in order:

1. Check the **Active** item in the tray and the switch in the window.
2. Close or minimize the fullscreen app: with `pauseOnFullscreen` detection stops.
3. Confirm the zone has an action other than `none` and is enabled.
4. Lower `dwellMs` (try 100 ms) and move closer to the corner; the effective area is `cornerSizePx` or `edgeSizePx`.

## 3. It fires by accident or fights another app

**Likely cause**: another tool uses the same corner (trackpad gestures, docks, screenshot apps) or the zone is too large.

**Fix**: reduce `cornerSizePx` or `edgeSizePx`, raise `dwellMs` and `cooldownMs`, or disable that zone. If the conflict is with one specific app, move the action to another zone.

## 4. It does not start with Windows

**Likely cause**: the registry value is missing, antivirus blocked it, or the executable moved.

**Fix**: check `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`, value `CreamCorners`. It must point at the current `.exe` path. If you moved the binary, toggle **Start with Windows** off and on to rewrite the value. Also check the antivirus protection history.

## 5. Settings were lost or the app starts with defaults

**Likely cause**: `settings.json` was corrupt and there was no valid backup.

**Fix**: open the config folder (**Open config folder**). If `settings.corrupt-<epoch>.json` exists, open it and recover fields by hand. If `settings.bak.json` exists, quit the app, copy it over `settings.json` and start the app again. A JSON file with missing or out-of-range fields is sanitized, not rejected.

## 6. Keyboard actions do not reach an app

**Likely cause**: the foreground window runs elevated and UIPI drops the synthetic input from `keybd_event`.

**Fix**: run Cream Corners as administrator, or use a preset that does not depend on keys (`file_explorer` or `settings`, for example). Some apps filter injected input and will ignore the shortcut either way.

## 7. A second window appears, or nothing opens

**Likely cause**: an instance is already running. The app holds the `Local\CreamCornersSingleton` mutex and the second instance exits.

**Fix**: find the tray icon and choose **Change commands**; a second launch of the executable should also raise the existing window. If it does not respond, end it from Task Manager and start it again.

## 8. Zones are offset with multiple monitors

**Likely cause**: the app is not per-monitor DPI aware; zones are computed in physical pixels and do not scale per monitor.

**Fix**: use the same scale on every monitor, or set `"monitorScope": "primary"` and configure the zones on the primary monitor.

## 9. "Access denied" when running the executable from a user folder

**Likely cause**: local policy or corporate antivirus blocks writes to `%APPDATA%\CreamCorners\` (observed as OS error 5 on the development machine).

**Fix**: install with the installer and run it from `C:\Program Files\Cream Corners`. The installed copy writes the configuration normally.

## 10. Blank window or no startup

**Likely cause**: the WebView2 Runtime is missing.

**Fix**: install it from <https://developer.microsoft.com/microsoft-edge/webview2/> and reopen Cream Corners.

## Logs

There is no log file. Diagnostic messages go through `eprintln!` to standard error:

```powershell
& "C:\Program Files\Cream Corners\cream-corners.exe"
```

Running from PowerShell reveals the errors the UI reports as `action-error`. In development, `npm run tauri dev` prints the same output in its console.

---

Cream Corners is created and maintained by [Canopus44](https://github.com/Canopus44).
