# Acciones

Una zona ejecuta exactamente una acción. Hay tres clases: preset, comando externo y URL. `none` desactiva el efecto aunque la zona esté activada.

## Presets

| ID | Atajo / destino | Para qué sirve |
|---|---|---|
| `task_view` | Win+Tab | Vista de tareas y escritorios virtuales |
| `show_desktop` | Win+D | Minimiza todo y muestra el escritorio |
| `lock` | `LockWorkStation` | Bloquea la sesión de Windows |
| `start_menu` | Ctrl+Esc | Abre el menú Inicio |
| `action_center` | Win+A | Centro de actividades y notificaciones |
| `widgets` | Win+W | Panel de widgets |
| `search` | Win+S | Búsqueda de Windows |
| `clipboard_history` | Win+V | Historial del portapapeles |
| `project_menu` | Win+P | Proyectar en otra pantalla |
| `quick_link` | Win+X | Menú de enlaces rápidos (Win+X) |
| `desktop_left` | Win+Ctrl+← | Escritorio virtual anterior |
| `desktop_right` | Win+Ctrl+→ | Escritorio virtual siguiente |
| `file_explorer` | `explorer.exe` | Abre el Explorador de archivos |
| `settings` | `ms-settings:` | Configuración de Windows |
| `screen_snip` | `ms-screenclip:` | Recorte de pantalla |
| `task_manager` | Ctrl+Shift+Esc | Administrador de tareas |
| `alt_tab` | Alt+Tab | Cambia a la ventana siguiente |

La acción serializada en el JSON queda como:

```json
{ "type": "preset", "id": "task_view" }
```

## Comandos externos

Se ejecuta un programa con una lista de argumentos. No hay shell: no se interpretan comillas, variables de entorno ni operadores como `|`, `>` o `&&`.

```json
{
  "type": "command",
  "program": "explorer.exe",
  "args": ["C:\\"]
}
```

Reglas del saneado: programa hasta 2048 caracteres, máximo 32 argumentos de 1024 caracteres cada uno. Si `program` queda vacío, la acción se convierte en `{"type":"none"}`. El primer elemento ejecutable es siempre `program`; no se permite pasar el programa dentro de `args`.

Programa sin ruta completa se resuelve con la búsqueda estándar de Windows, así que `explorer.exe` o `notepad.exe` funcionan sin indicar carpeta.

## URLs

Esquemas aceptados: `http`, `https`, `ms-` y `shell:`. La URL se abre con `ShellExecute`.

```json
{ "type": "url", "url": "https://example.com" }
```

Una URL vacía o de otro esquema se descarta y la acción queda en `{"type":"none"}`.

## Seguridad

- Un comando se ejecuta con los privilegios de la app, sin confirmación. No importes configuraciones de fuentes no confiables: revisa `program`, `args` y `url` antes de usarlas.
- `shell:` y `ms-` pueden abrir rutas y paneles del sistema. Trátalos como entrada sensible.
- Las teclas de los presets son sintéticas: si una ventana en primer plano es elevada (UIPI), puede ignorarlas. Ejecutar Cream Corners como administrador reduce el problema.
