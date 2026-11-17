[English](README.md) · [Español](README.es.md)

<img src="docs/images/app-icon.png" width="96" alt="Icono de Cream Corners">

# Cream Corners

App de hot corners para Windows 10/11: al llevar el cursor a una esquina o a un borde de la pantalla se ejecuta una acción (ver tareas, mostrar escritorio, bloquear el equipo, abrir una URL, lanzar un programa). Escrita en Rust + Tauri 2, con UI web en TypeScript sin framework y estética iOS sobre paleta crema.

[![Rust](https://img.shields.io/badge/Rust-2021-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-green)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D4?logo=windows&logoColor=white)](docs/es/instalacion.md#requisitos)

Vive en la bandeja del sistema. Al cerrar la ventana no se cierra la app: se oculta y se reabre con clic izquierdo en el icono, con doble clic o con **Cambiar comandos** en el menú.

## Capturas

Ventana principal, con las ocho zonas y sus acciones:

<img src="docs/images/zones.png" width="720" alt="Ventana principal de Cream Corners con las ocho zonas">

Ajustes generales: activación, demora, cooldown, tamaños, multi-monitor e inicio con Windows:

<img src="docs/images/settings.png" width="720" alt="Pantalla de ajustes de Cream Corners">

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
| Instancia única | Mutex `Local\CreamCornersSingleton`; el segundo lanzamiento trae al frente la ventana existente |
| Config versionada | Autoguardado, backup y recuperación de archivos corruptos |
| Bandeja | Check "Activo", "Cambiar comandos", "Salir" |

## Inicio rápido

Para instalar la versión publicada, salta a [Instalación](#instalación). Para trabajar sobre el código, requisitos: Windows 10/11 x64, Rust estable ≥ 1.77, Node.js ≥ 20 y Visual Studio Build Tools con el workload "Desarrollo para el escritorio con C++".

```bash
npm install
npm run tauri dev     # desarrollo
npm run tauri build   # instaladores en src-tauri/target/release/bundle
```

Detalle completo en [docs/es/compilar.md](docs/es/compilar.md).

## Instalación

Descarga el instalador desde el [último release](https://github.com/Canopus44/cream-corners/releases/latest). El archivo recomendado es `Cream Corners_0.1.0_x64-setup.exe` (NSIS): instala para todos los usuarios en Archivos de programa, pide confirmación de UAC y ofrece la interfaz de instalación en inglés y español. El MSI `Cream Corners_0.1.0_x64_en-US.msi` es la alternativa para despliegue administrado. Ambos están adjuntos al release `v0.1.0`, junto con las sumas SHA-256 para verificar la descarga.

Si aparece SmartScreen, pulsa "Más información" y luego "Ejecutar de todas formas", porque los instaladores no están firmados. Al terminar, la app queda en la bandeja del sistema. Requiere Windows 10/11 x64 y WebView2 Runtime (incluido en Windows 11 y en la mayoría de Windows 10). La configuración vive en `%APPDATA%\CreamCorners\settings.json` y la desinstalación no la borra. Guía completa, requisitos, SmartScreen, checksums y problemas frecuentes en [docs/es/instalacion.md](docs/es/instalacion.md).

## Estructura

```
cream-corners/
├─ src-tauri/src/   # main, lib, settings, win32 (FFI), actions, engine, tray
├─ src/             # main.ts (UI), style.css, types.ts
├─ index.html
└─ docs/
```

## Documentación

La documentación está en dos idiomas: inglés como principal (`README.md`, `docs/*.md`) y español (`README.es.md`, `docs/es/*.md`). La interfaz de la app sigue en español.

- [Instalación](docs/es/instalacion.md) — instalar, primer uso, desinstalar y problemas frecuentes
- [Arquitectura](docs/es/arquitectura.md) — módulos, concurrencia, flujo del motor
- [Configuración](docs/es/configuracion.md) — archivo JSON, campos, backup y saneado
- [Acciones](docs/es/acciones.md) — presets, comandos y URLs
- [Compilar](docs/es/compilar.md) — requisitos, desarrollo y empaquetado
- [Solución de problemas](docs/es/solucion-de-problemas.md) — síntomas frecuentes
- [Contribuir](CONTRIBUTING.md) — flujo de trabajo, estilo y verificación (en inglés)

## Estado

- Frontend: `npm run build` verificado (tsc + vite).
- Backend Rust: `cargo check` y `npm run tauri build` verificados; instaladores NSIS y MSI generados.
- Prueba end-to-end real: el exe release renderiza la UI y abre "Vista de tareas" al dejar el cursor en la esquina superior izquierda.

Nota: en la máquina de desarrollo, ejecutar el exe desde una ruta bajo Documentos hace que el sistema deniegue la escritura de la configuración (os error 5). Instalado en Archivos de programa funciona con normalidad; ver [solución de problemas](docs/es/solucion-de-problemas.md).

## Limitaciones

- Sólo Windows. La UI está en español y no hay actualizador automático.
- El motor sondea el cursor en lugar de usar un hook de mouse, así que la latencia es aproximadamente el intervalo de sondeo.
- Las teclas se envían con `keybd_event` (entrada sintética): algunas apps o ventanas elevadas pueden ignorarlas. Sin firma de código, SmartScreen puede advertir al instalar.
- No es per-monitor DPI aware: con escalas distintas por monitor las zonas pueden quedar desplazadas.

## Contribuir

El flujo, los estándares de código y las comprobaciones previas a un PR están en [CONTRIBUTING.md](CONTRIBUTING.md) (en inglés). Los cambios de documentación deben mantener sincronizadas las dos versiones, inglesa y española.

## Licencia y atribución

MIT, año 2026, titulares "Cream Corners contributors" (ver `LICENSE`).

Inspirada en [HotCornersWin](https://github.com/flexits/HotCornersWin) de flexits (C#/.NET) y en la idea de hot corners de macOS, GNOME y KDE. Esta versión está reescrita en Rust y amplía el original con bordes, demora y cooldown por zona, pausa en pantalla completa, multi-monitor y configuración versionada.
