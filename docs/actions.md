[English](actions.md) · [Español](es/acciones.md)

# Actions

A zone runs exactly one action. There are three kinds: preset, external command and URL. `none` disables the effect even when the zone is enabled.

## Presets

| ID | Shortcut / target | What it does |
|---|---|---|
| `task_view` | Win+Tab | Task view and virtual desktops |
| `show_desktop` | Win+D | Minimizes everything and shows the desktop |
| `lock` | `LockWorkStation` | Locks the Windows session |
| `start_menu` | Ctrl+Esc | Opens the Start menu |
| `action_center` | Win+A | Action center and notifications |
| `widgets` | Win+W | Widgets panel |
| `search` | Win+S | Windows search |
| `clipboard_history` | Win+V | Clipboard history |
| `project_menu` | Win+P | Project to another display |
| `quick_link` | Win+X | Quick link menu |
| `desktop_left` | Win+Ctrl+Left | Previous virtual desktop |
| `desktop_right` | Win+Ctrl+Right | Next virtual desktop |
| `file_explorer` | `explorer.exe` | Opens File Explorer |
| `settings` | `ms-settings:` | Windows Settings |
| `screen_snip` | `ms-screenclip:` | Screen snip |
| `task_manager` | Ctrl+Shift+Esc | Task Manager |
| `alt_tab` | Alt+Tab | Switches to the next window |

The serialized action in the JSON stays as:

```json
{ "type": "preset", "id": "task_view" }
```

## External commands

A program runs with an argument list. There is no shell: quotes, environment variables and operators such as `|`, `>` or `&&` are not interpreted.

```json
{
  "type": "command",
  "program": "explorer.exe",
  "args": ["C:\\"]
}
```

Sanitizing rules: program up to 2048 characters, at most 32 arguments of 1024 characters each. If `program` ends up empty, the action becomes `{"type":"none"}`. The executable is always `program`; passing the program inside `args` is not supported.

A program without a full path is resolved through the standard Windows search, so `explorer.exe` or `notepad.exe` work without a folder.

## URLs

Accepted schemes: `http`, `https`, `ms-` and `shell:`. The URL is opened with `ShellExecute`.

```json
{ "type": "url", "url": "https://example.com" }
```

An empty URL, or one with another scheme, is discarded and the action becomes `{"type":"none"}`.

## Picking a good action

- Prefer a preset over a command when one exists: it needs no path and survives upgrades.
- For commands, point at an executable rather than a document so a file association cannot change the behaviour.
- Give destructive or disruptive actions (`lock`, `desktop_left`, `desktop_right`) a longer dwell so a stray cursor pass does not fire them.
- Corner zones are harder to hit by accident than edges; use edges for harmless actions.

## Security

- A command runs with the app's privileges, with no confirmation. Do not import configurations from untrusted sources: read `program`, `args` and `url` before using them.
- `shell:` and `ms-` can open system paths and panels. Treat them as sensitive input.
- Preset keys are synthetic: if the foreground window is elevated (UIPI), it may ignore them. Running Cream Corners as administrator reduces the problem.

---

Cream Corners is created and maintained by [Canopus44](https://github.com/Canopus44).
