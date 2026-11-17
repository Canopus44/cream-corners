# Cream Corners

[![Rust](https://img.shields.io/badge/Rust-2021-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-green)](LICENSE)

App de hot corners para Windows 10/11: al llevar el cursor a una esquina o a un borde de la pantalla se ejecuta una acción (ver tareas, mostrar escritorio, bloquear el equipo, abrir una URL, lanzar un programa). Escrita en Rust + Tauri 2, con UI web en TypeScript sin framework y estética iOS sobre paleta crema.

Vive en la bandeja del sistema. Al cerrar la ventana no se cierra la app: se oculta y se reabre con clic izquierdo en el icono o con "Abrir ajustes" en el menú.

## Funciones

| Función | Detalle |
|---|---|
| 8 zonas | 4 esquinas + 4 bordes, cada una con activación, acción y demora propias |
| 17 presets | Atajos y utilidades de Windows listos para asignar |
| Comandos externos | Programa + argumentos, sin shell intermedio |
| URLs | Esquemas `http`, `https`, `ms-`, `shell:` |
| Demora de activación | Global 0–3000 ms (220 por defecto) y anulación por zona |
| Cooldown | 0–10000 ms (800 por defecto) para evitar re-disparos |
| Tamaño de zona | Esquina 1–64 px (6 por defecto), borde 1–32 px (4 por defecto) |
| Sondeo del cursor | 15–500 ms (40 por defecto) |
| Ignorar arrastres | No dispara mientras hay un botón del mouse presionado |
| Pausa en pantalla completa | Detecta apps fullscreen y no interfiere con el escritorio ni la barra de tareas |
| Multi-monitor | Alcance en todos los monitores o sólo el principal |
| Inicio con Windows | Entrada `CreamCorners` en `HKCU\...\CurrentVersion\Run` |
| Instancia única | Mutex con nombre `Local\CreamCornersSingleton` |
| Config versionada | Autoguardado, backup y recuperación de archivos corruptos |
| Bandeja | Check "Activo", "Abrir ajustes", "Salir" |

## Inicio rápido

Requisitos: Windows 10/11 x64, Rust estable ≥ 1.77, Node.js ≥ 20 y Visual Studio Build Tools con el workload "Desarrollo para el escritorio con C++".

```bash
npm install
npm run tauri dev     # desarrollo
npm run tauri build   # instaladores en src-tauri/target/release/bundle
```

Detalle completo en [docs/compilar.md](docs/compilar.md).

## Estructura

```
cream-corners/
├─ src-tauri/src/   # main, lib, settings, win32 (FFI), actions, engine, tray
├─ src/             # main.ts (UI), style.css, types.ts
├─ index.html
└─ docs/
```

## Documentación

- [Arquitectura](docs/arquitectura.md) — módulos, concurrencia, flujo del motor
- [Configuración](docs/configuracion.md) — archivo JSON, campos, backup y saneado
- [Acciones](docs/acciones.md) — presets, comandos y URLs
- [Compilar](docs/compilar.md) — requisitos, desarrollo y empaquetado
- [Solución de problemas](docs/solucion-de-problemas.md) — síntomas frecuentes

## Estado

El frontend compila y se verificó `npm run build`. El backend Rust todavía no se compiló en esta máquina: falta el workload C++ de Visual Studio, que aporta el linker MSVC y el Windows SDK. El modo vista previa (`npm run dev` en el navegador) funciona sin backend y usa ajustes en memoria.

## Limitaciones

- Sólo Windows. La UI está en español y no hay actualizador automático.
- El motor sondea el cursor en lugar de usar un hook de mouse, así que la latencia es aproximadamente el intervalo de sondeo.
- Las teclas se envían con `keybd_event` (entrada sintética): algunas apps o ventanas elevadas pueden ignorarlas. Sin firma de código, SmartScreen puede advertir al instalar.

## Licencia y atribución

MIT, año 2026, titulares "Cream Corners contributors" (ver `LICENSE`).

Inspirada en [HotCornersWin](https://github.com/flexits/HotCornersWin) de flexits (C#/.NET) y en la idea de hot corners de macOS, GNOME y KDE. Esta versión está reescrita en Rust y amplía el original con bordes, demora y cooldown por zona, pausa en pantalla completa, multi-monitor y configuración versionada.

