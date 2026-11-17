# Compilar

## Requisitos

| Requisito | Versión / detalle |
|---|---|
| Windows | 10 u 11, x64 |
| Rust | estable ≥ 1.77, instalado con [rustup](https://rustup.rs/) |
| Node.js | ≥ 20 ([nodejs.org](https://nodejs.org/)) |
| Visual Studio Build Tools | workload "Desarrollo para el escritorio con C++" ([descarga](https://visualstudio.microsoft.com/visual-cpp-build-tools/)) |
| WebView2 Runtime | incluido en Windows 11 y en la mayoría de Windows 10 ([detalle](https://developer.microsoft.com/microsoft-edge/webview2/)) |

El workload C++ es obligatorio: aporta `link.exe`, la librería de importación de MSVC y el Windows SDK. Sin él, el build falla con `link.exe not found` o errores de `lib.exe`.

### Instalar el workload C++

1. Ejecuta el instalador de Visual Studio Build Tools (o el de Visual Studio Community).
2. En "Cargas de trabajo", marca **Desarrollo para el escritorio con C++**.
3. En "Detalles de instalación", confirma MSVC v143 y Windows 10/11 SDK.
4. Instala y abre una terminal nueva para que `cargo` herede el entorno.

Prerrequisitos oficiales de Tauri: <https://v2.tauri.app/start/prerequisites/>.

## Instalación

```bash
npm install
```

Si npm bloquea los scripts de instalación (por ejemplo, con la política de sandbox de scripts), aprueba esbuild:

```bash
npm install-scripts approve esbuild
```

## Desarrollo

```bash
npm run tauri dev
```

Levanta Vite en el puerto 1420 y abre la ventana de Tauri. La primera compilación del backend tarda varios minutos; las siguientes son incrementales.

Sólo UI, sin backend (modo vista previa en el navegador):

```bash
npm run dev
```

Ese modo usa ajustes en memoria y muestra un banner de vista previa; no se disparan acciones.

## Build release

```bash
npm run tauri build
```

Salida esperada:

```
src-tauri/target/release/cream-corners.exe
src-tauri/target/release/bundle/nsis/Cream Corners_<version>_x64-setup.exe
src-tauri/target/release/bundle/msi/Cream Corners_<version>_x64_en-US.msi
```

El bundle se genera para nsis y msi según `src-tauri/tauri.conf.json`. Ambos instaladores son el mismo binario empaquetado; no hay firma de código, así que SmartScreen puede advertir.

## Verificación

Comprobación rápida del frontend:

```bash
npm run build
```

Se verificó que ese comando compila el frontend en esta máquina. El backend Rust **no** se compiló aquí: requiere el workload C++ de Visual Studio. Tras instalar ese workload, valida con `npm run tauri build` antes de distribuir. El build de release no genera logs a archivo; para ver los errores en tiempo de ejecución, lanza el `.exe` desde PowerShell y observa la salida estándar de error.
