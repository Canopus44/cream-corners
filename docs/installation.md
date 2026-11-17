[English](installation.md) · [Español](es/instalacion.md)

# Installation

How to install Cream Corners 0.1.0 on Windows 10/11 x64 from the published GitHub installers. To build from source, see [building.md](building.md).

## Requirements

- 64-bit Windows 10 or 11 (x64). There is no ARM64 build.
- WebView2 Runtime, bundled with Windows 11 and most updated Windows 10 installs. If missing, install it from <https://developer.microsoft.com/microsoft-edge/webview2/> ("Evergreen Bootstrapper" or the x64 standalone installer).
- About 10 MB of disk for the program, plus a few KB for configuration.
- Administrator rights: the installers are per-machine and write to `Program Files`.

## Download

1. Open the release page: <https://github.com/Canopus44/cream-corners/releases/latest>.
2. Under the assets of release `v0.1.0`, download one of the two installers:

| File | Format | When to use it |
|---|---|---|
| `Cream Corners_0.1.0_x64-setup.exe` | NSIS | Recommended for normal use |
| `Cream Corners_0.1.0_x64_en-US.msi` | WiX / Windows Installer | Managed deployment or scripted installs |

Both carry the same program; you only need one.

## Install

### Recommended: NSIS (`Cream Corners_0.1.0_x64-setup.exe`)

1. Double-click the file.
2. If SmartScreen appears, see [SmartScreen](#smartscreen).
3. Accept the UAC prompt. The installer is per-machine and writes to `C:\Program Files\Cream Corners`.
4. Pick the installer language (English or Spanish), follow the wizard and finish.

The NSIS installer adds a Start menu entry and registers the app under "Installed apps" so it can be uninstalled later.

### Alternative: MSI (`Cream Corners_0.1.0_x64_en-US.msi`)

1. Double-click the file and accept the administrator prompt.
2. Follow the Windows Installer wizard to the end.

The MSI is the right choice when the app is rolled out with management tooling (GPO, Intune, SCCM), since it installs to `C:\Program Files\Cream Corners` for all users. For a silent install:

```powershell
msiexec /i "Cream Corners_0.1.0_x64_en-US.msi" /qn
```

## First run

When installation finishes, Cream Corners starts and stays in the system tray next to the clock. It shows no window at startup if a configuration already exists.

- **Open the window**: left click the tray icon, double click it, or right click and choose **Change commands**.
- **Close the window**: it hides into the tray. The process keeps running and the zones keep working.
- **Quit completely**: right click the tray icon and choose **Exit**.

Factory zones:

| Zone | Action |
|---|---|
| Top-left corner | Task View |
| Bottom-left corner | Show desktop |
| Bottom-right corner | Lock the PC |
| Other corners and edges | No action |

To check it works, leave the cursor still in the top-left corner: Windows Task View should open. If it does not, see [troubleshooting.md](troubleshooting.md). Every zone is configured in the window — enabled flag, action, its own dwell and size — and settings save themselves.

## SmartScreen

The installers are not signed with a code-signing certificate, so Windows may show the blue "Windows protected your PC" screen with publisher "Unknown publisher".

Click **More info**, then **Run anyway**. This is normal for unsigned programs and does not mean the file was modified. To verify a download, compare its hash with the release notes; if none are published, the only check available is the one Windows performs on download:

```powershell
Get-FileHash ".\Cream Corners_0.1.0_x64-setup.exe" -Algorithm SHA256
```

## Where the configuration lives

Cream Corners keeps everything in `%APPDATA%\CreamCorners\`, falling back to `%LOCALAPPDATA%\CreamCorners\` when `%APPDATA%` is unavailable:

| File | Content |
|---|---|
| `settings.json` | Active configuration |
| `settings.bak.json` | Copy of the last valid version |
| `settings.corrupt-<epoch>.json` | Quarantine of a file that could not be read |

Use **Open config folder** in the app window to get there; field reference in [configuration.md](configuration.md). Uninstalling does **not** delete this folder, so reinstalling restores your settings. To start clean, quit the app and remove it:

```powershell
Remove-Item -Recurse "$env:APPDATA\CreamCorners"
```

## Start with Windows

The **Start with Windows** switch creates or removes the `CreamCorners` value under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`. It is a per-user entry and needs no administrator rights. If you move the executable, toggle the switch off and on so the recorded path is rewritten.

## Uninstall

Open **Settings → Apps → Installed apps** (Windows 11) or **Settings → Apps & features** / **Control Panel → Programs and Features** (Windows 10), find **Cream Corners**, choose **Uninstall** and confirm the UAC prompt.

- The program, shortcuts and uninstall entry are removed.
- Configuration in `%APPDATA%\CreamCorners\` is kept; delete it by hand if you do not want it.
- The `CreamCorners` autostart value remains if it was on. Remove it with:

```powershell
Remove-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name CreamCorners -ErrorAction SilentlyContinue
```

If the tray icon stays visible after uninstalling, restart Explorer from Task Manager (right click **Windows Explorer** → **Restart**) or sign out and back in.
