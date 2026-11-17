[English](../configuration.md) · [Español](configuracion.md)

# Configuración

## Archivos

Ruta principal: `%APPDATA%\CreamCorners\settings.json`. Si `%APPDATA%` no está disponible, se usa `%LOCALAPPDATA%\CreamCorners\settings.json`. El botón "Abrir carpeta de configuración" (`open_config_dir`) abre esa carpeta.

| Archivo | Cuándo aparece |
|---|---|
| `settings.json` | Configuración activa |
| `settings.bak.json` | Copia de la versión anterior válida |
| `settings.corrupt-<epoch>.json` | Cuarentena de un archivo que no se pudo leer |
| `settings.json.tmp` | Temporal de la escritura atómica; no debe quedar tras un cierre normal |

La escritura es atómica: se escribe el temporal, se copia el archivo actual a `.bak` y se reemplaza el principal.

## Campos

Todos los campos tienen default, así que un JSON parcial es válido. El saneado se aplica al cargar y al guardar.

| Campo | Tipo | Rango / valores | Default |
|---|---|---|---|
| `version` | entero | 1 | `1` |
| `enabled` | booleano | — | `true` |
| `pollIntervalMs` | entero | 15–500 | `40` |
| `cornerSizePx` | entero | 1–64 | `6` |
| `edgeSizePx` | entero | 1–32 | `4` |
| `dwellMs` | entero | 0–3000 | `220` |
| `cooldownMs` | entero | 0–10000 | `800` |
| `ignoreDragging` | booleano | — | `true` |
| `pauseOnFullscreen` | booleano | — | `true` |
| `monitorScope` | texto | `"all"` \| `"primary"` | `"all"` |
| `startWithWindows` | booleano | — | `false` |
| `showTrayNotifications` | booleano | — | `true` |
| `zones` | objeto | 8 claves, ver abajo | ver abajo |

Cada zona (`topLeft`, `topRight`, `bottomLeft`, `bottomRight`, `topEdge`, `bottomEdge`, `leftEdge`, `rightEdge`) es un objeto:

| Campo | Tipo | Rango / valores | Default |
|---|---|---|---|
| `enabled` | booleano | — | ver tabla de zonas |
| `dwellMs` | entero o `null` | 0–3000 | `null` (usa la demora global) |
| `action` | objeto | acción serializada | `{"type":"none"}` |

Zonas por defecto: `topLeft` = Ver tareas, `bottomLeft` = Mostrar escritorio, `bottomRight` = Bloquear PC con `dwellMs` 400. El resto desactivadas.

## Ejemplo completo

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

## Formato de acción

| Tipo | Ejemplo |
|---|---|
| Nada | `{"type":"none"}` |
| Preset | `{"type":"preset","id":"task_view"}` |
| Comando | `{"type":"command","program":"explorer.exe","args":["C:\\"]}` |
| URL | `{"type":"url","url":"ms-settings:"}` |

## Backup, cuarentena y saneado

- **Backup**: cada guardado con éxito deja la versión previa en `settings.bak.json`.
- **Cuarentena**: si `settings.json` no se puede deserializar, se renombra a `settings.corrupt-<epoch>.json` y se intenta leer el `.bak`. Si el backup tampoco sirve, se arranca con los defaults.
- **Saneado**: los numéricos se recortan a su rango (`pollIntervalMs` 15–500, `cornerSizePx` 1–64, `edgeSizePx` 1–32, `dwellMs` y `cooldownMs` hasta 3000 y 10000, `dwellMs` de zona ≤ 3000). Un comando se limita a 32 argumentos de 1024 caracteres y programa/URL a 2048. Un comando vacío o una URL vacía se convierten en `{"type":"none"}`.
- **Autoguardado**: la UI guarda con debounce de 400 ms y siempre adopta la configuración saneada que devuelve el backend.

## Importar y exportar a mano

1. Cierra Cream Corners desde la bandeja ("Salir").
2. Copia `settings.json` dentro o fuera de la carpeta de configuración.
3. Vuelve a abrir la app: el archivo se sanea al cargar y se reescribe en formato canónico.

No edites el archivo con la app abierta: el autoguardado puede sobrescribir tus cambios.

## Migración de versión

`version` identifica el formato. No hay migradores: los campos ausentes toman su default y `version` se reescribe con el valor actual al guardar. Un archivo de una versión futura se carga igual, siempre que conserve los nombres de campo; los desconocidos se descartan.

---

Cream Corners está creado y mantenido por [Canopus44](https://github.com/Canopus44).
