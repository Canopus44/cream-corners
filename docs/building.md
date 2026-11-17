[English](building.md) · [Español](es/compilar.md)

# Building

## Requirements

| Requirement | Version / detail |
|---|---|
| Windows | 10 or 11, x64 |
| Rust | stable ≥ 1.77, installed with [rustup](https://rustup.rs/) |
| Node.js | ≥ 20 ([nodejs.org](https://nodejs.org/)) |
| Visual Studio Build Tools | "Desktop development with C++" workload ([download](https://visualstudio.microsoft.com/visual-cpp-build-tools/)) |
| WebView2 Runtime | Included in Windows 11 and most Windows 10 ([details](https://developer.microsoft.com/microsoft-edge/webview2/)) |

The C++ workload is mandatory: it provides `link.exe`, the MSVC import library and the Windows SDK. Without it the build fails with `link.exe not found` or `lib.exe` errors.

### Installing the C++ workload

1. Run the Visual Studio Build Tools installer (or Visual Studio Community).
2. Under "Workloads", check **Desktop development with C++**.
3. Under "Installation details", confirm MSVC v143 and the Windows 10/11 SDK.
4. Install, then open a new terminal so `cargo` inherits the environment.

Official Tauri prerequisites: <https://v2.tauri.app/start/prerequisites/>.

## Setup

```bash
npm install
```

If npm blocks install scripts (a script sandbox policy, for example), approve esbuild:

```bash
npm install-scripts approve esbuild
```

## Development

```bash
npm run tauri dev
```

This starts Vite on port 1420 and opens the Tauri window. The first backend compile takes several minutes; later ones are incremental.

UI only, without the backend (browser preview):

```bash
npm run dev
```

That mode uses in-memory settings and shows a preview banner; no actions fire.

## Release build

```bash
npm run tauri build
```

Expected output:

```
src-tauri/target/release/cream-corners.exe
src-tauri/target/release/bundle/nsis/Cream Corners_<version>_x64-setup.exe
src-tauri/target/release/bundle/msi/Cream Corners_<version>_x64_en-US.msi
```

The bundle targets nsis and msi as configured in `src-tauri/tauri.conf.json`. Both installers wrap the same binary and are per-machine, so they install under `Program Files` and require UAC. There is no code signing, so SmartScreen may warn.

## Verification

Quick frontend check:

```bash
npm run build
```

That runs `tsc --noEmit` and a Vite production build. For the backend:

```bash
cd src-tauri
cargo check
```

Both have been verified on the development machine, together with `npm run tauri build` producing the NSIS and MSI bundles. The release build writes no log file; to see runtime errors, launch the `.exe` from PowerShell and watch standard error:

```powershell
& "C:\Program Files\Cream Corners\cream-corners.exe"
```

## Project layout

```
cream-corners/
├─ src-tauri/src/   # main, lib, settings, win32 (FFI), actions, engine, tray
├─ src/             # main.ts (UI), style.css, types.ts
├─ index.html
└─ docs/
```

`src-tauri/target/` and `dist/` are build output and stay out of version control.
