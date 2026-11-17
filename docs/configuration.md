[English](configuration.md) · [Español](es/configuracion.md)

# Configuration

## Files

Primary path: `%APPDATA%\CreamCorners\settings.json`. If `%APPDATA%` is unavailable, `%LOCALAPPDATA%\CreamCorners\settings.json` is used. The **Open config folder** button (`open_config_dir`) opens that directory.

| File | When it appears |
|---|---|
| `settings.json` | Active configuration |
| `settings.bak.json` | Copy of the previous valid version |
| `settings.corrupt-<epoch>.json` | Quarantine of a file that could not be read |
| `settings.json.tmp` | Temporary file of the atomic write; it should not survive a clean exit |

Writes are atomic: the temporary file is written, the current file is copied to `.bak`, and the main file is replaced.

## Fields

Every field has a default, so a partial JSON document is valid. Sanitizing runs on load and on save.

| Field | Type | Range / values | Default |
|---|---|---|---|
| `version` | integer | 1 | `1` |
| `enabled` | boolean | — | `true` |
| `pollIntervalMs` | integer | 15–500 | `40` |
| `cornerSizePx` | integer | 1–64 | `6` |
| `edgeSizePx` | integer | 1–32 | `4` |
| `dwellMs` | integer | 0–3000 | `220` |
| `cooldownMs` | integer | 0–10000 | `800` |
| `ignoreDragging` | boolean | — | `true` |
| `pauseOnFullscreen` | boolean | — | `true` |
| `monitorScope` | string | `"all"` \| `"primary"` | `"all"` |
| `startWithWindows` | boolean | — | `false` |
| `showTrayNotifications` | boolean | — | `true` |
| `zones` | object | 8 keys, see below | see below |

Each zone (`topLeft`, `topRight`, `bottomLeft`, `bottomRight`, `topEdge`, `bottomEdge`, `leftEdge`, `rightEdge`) is an object:

| Field | Type | Range / values | Default |
|---|---|---|---|
| `enabled` | boolean | — | see the zone table |
| `dwellMs` | integer or `null` | 0–3000 | `null` (uses the global dwell) |
| `action` | object | serialized action | `{"type":"none"}` |

Default zones: `topLeft` = Task View, `bottomLeft` = show desktop, `bottomRight` = lock the PC with `dwellMs` 400. Everything else is disabled.

## Full example

```json
{
  "version": 1,
  "enabled": true,
  "pollIntervalMs": 40,
  "cornerSizePx": 6,
  "edgeSizePx": 4,
  "dwellMs": 220,
  "cooldownMs": 800,
  "ignoreDragging": true,
  "pauseOnFullscreen": true,
  "monitorScope": "all",
  "startWithWindows": false,
  "showTrayNotifications": true,
  "zones": {
    "topLeft": { "enabled": true, "dwellMs": null, "action": { "type": "preset", "id": "task_view" } },
    "topRight": { "enabled": false, "dwellMs": null, "action": { "type": "none" } },
    "bottomLeft": { "enabled": true, "dwellMs": null, "action": { "type": "preset", "id": "show_desktop" } },
    "bottomRight": { "enabled": true, "dwellMs": 400, "action": { "type": "preset", "id": "lock" } },
    "topEdge": { "enabled": false, "dwellMs": null, "action": { "type": "none" } },
    "bottomEdge": { "enabled": false, "dwellMs": null, "action": { "type": "none" } },
    "leftEdge": { "enabled": false, "dwellMs": null, "action": { "type": "none" } },
    "rightEdge": { "enabled": false, "dwellMs": null, "action": { "type": "none" } }
  }
}
```

## Action format

| Type | Example |
|---|---|
| None | `{"type":"none"}` |
| Preset | `{"type":"preset","id":"task_view"}` |
| Command | `{"type":"command","program":"explorer.exe","args":["C:\\"]}` |
| URL | `{"type":"url","url":"ms-settings:"}` |

## Backup, quarantine and sanitizing

- **Backup**: every successful save leaves the previous version in `settings.bak.json`.
- **Quarantine**: if `settings.json` cannot be deserialized it is renamed to `settings.corrupt-<epoch>.json` and the `.bak` is tried. If the backup fails too, the app starts with defaults.
- **Sanitizing**: numbers are clamped to their range (`pollIntervalMs` 15–500, `cornerSizePx` 1–64, `edgeSizePx` 1–32, `dwellMs` and `cooldownMs` up to 3000 and 10000, zone `dwellMs` up to 3000). A command is limited to 32 arguments of 1024 characters, and the program or URL to 2048. An empty command or URL becomes `{"type":"none"}`.
- **Autosave**: the UI saves with a 400 ms debounce and always adopts the sanitized settings the backend returns.

## Import and export by hand

1. Quit Cream Corners from the tray (**Exit**).
2. Copy `settings.json` into or out of the config folder.
3. Start the app again: the file is sanitized on load and rewritten in canonical form.

Do not edit the file while the app is running: autosave can overwrite your changes.

## Version migration

`version` identifies the format. There are no migrators: missing fields take their defaults and `version` is rewritten with the current value on save. A file from a future version still loads as long as the field names match; unknown fields are dropped.

---

Cream Corners is created and maintained by [Canopus44](https://github.com/Canopus44).
