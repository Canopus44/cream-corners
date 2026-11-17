[English](../troubleshooting.md) · [Español](solucion-de-problemas.md)

# Solución de problemas

## 1. El build falla con `link.exe not found`

**Causa probable**: falta el linker de MSVC. Rust usa la toolchain MSVC en Windows.

**Solución**: instala Visual Studio Build Tools con el workload "Desarrollo para el escritorio con C++" (incluye MSVC v143 y Windows SDK), abre una terminal nueva y repite `npm run tauri build`. Verifica con `rustup show` que la toolchain activa sea `stable-x86_64-pc-windows-msvc`.

## 2. La app no reacciona al llegar a una esquina o borde

**Causa probable**: el interruptor general está apagado, hay una app en pantalla completa, la zona está desactivada o la demora es demasiado alta.

**Solución**, en orden:

1. Revisa el check "Activo" en la bandeja y el switch de la ventana.
2. Cierra o minimiza la app fullscreen: con `pauseOnFullscreen` la detección se pausa.
3. Confirma que la zona tenga acción distinta de `none` y que esté activada.
4. Baja `dwellMs` (prueba 100 ms) y acércate más a la esquina; el tamaño efectivo es `cornerSizePx` o `edgeSizePx`.

## 3. Se dispara sin querer o choca con otra app

**Causa probable**: otra herramienta usa la misma esquina (gestos de trackpad, docks, apps de captura) o la zona es demasiado grande.

**Solución**: reduce `cornerSizePx` o `edgeSizePx`, sube `dwellMs` y `cooldownMs`, o desactiva esa zona concreta. Si el conflicto es con una app puntual, asigna la acción a otra zona.

## 4. No arranca con Windows

**Causa probable**: la entrada de registro no existe, el antivirus la bloqueó o el ejecutable se movió de ruta.

**Solución**: revisa `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`, valor `CreamCorners`. Debe apuntar a la ruta actual del `.exe`. Si moviste el binario, desactiva y reactiva "Iniciar con Windows" para reescribir el valor. Revisa también el historial de protección del antivirus.

## 5. La configuración se perdió o la app arranca con valores por defecto

**Causa probable**: `settings.json` quedó corrupto y no había backup válido.

**Solución**: revisa la carpeta de configuración (`open_config_dir`). Si existe `settings.corrupt-<epoch>.json`, ábrelo y recupera los campos a mano. Si existe `settings.bak.json`, cierra la app, cópialo sobre `settings.json` y vuelve a abrirla. Un JSON con campos faltantes o fuera de rango se sanea, no se rechaza.

## 6. Las acciones de teclado no llegan a una app

**Causa probable**: la ventana en primer plano corre elevada y UIPI descarta la entrada sintética de `keybd_event`.

**Solución**: ejecuta Cream Corners como administrador o usa un preset que no dependa de teclas (por ejemplo `file_explorer` o `settings`). Algunas apps que filtran entrada inyectada ignorarán el atajo en cualquier caso.

## 7. Aparece una segunda ventana o no abre nada

**Causa probable**: ya hay una instancia activa. La app usa el mutex `Local\CreamCornersSingleton` y la segunda instancia termina, pero antes envía la señal `Local\CreamCornersShow` para que la ventana existente venga al frente.

**Solución**: si la ventana no aparece, busca el icono en la bandeja (tooltip "Cream Corners - clic para cambiar comandos") y usa "Cambiar comandos" en el menú. Si no responde, ciérrala desde el Administrador de tareas y vuelve a iniciarla.

## 8. Las zonas quedan desplazadas con varios monitores

**Causa probable**: la app no es per-monitor DPI aware; las zonas se calculan en píxeles físicos y no escalan por monitor.

**Solución**: usa la misma escala en todos los monitores, o limita el alcance a `"monitorScope": "primary"` y configura las zonas en el monitor principal.

## 9. "Acceso denegado" (os error 5) al ejecutar el exe desde Documentos

**Causa probable**: en la máquina de desarrollo, ejecutar el binario desde una ruta bajo Documentos hace que el sistema deniegue la escritura de la configuración, aunque `%APPDATA%` sea escribible. Se observó con el exe release copiado a mano; las políticas locales o el antivirus corporativo pueden influir.

**Solución**: instala con el instalador per-machine y ejecuta desde `C:\Program Files\Cream Corners\`, donde la escritura funciona con normalidad. Si necesitas usar el exe portable, cópialo a una carpeta fuera de Documentos.

## Logs

No hay registro a archivo. Los mensajes de diagnóstico salen por `eprintln!` a la salida estándar de error:

```powershell
& "$env:ProgramFiles\Cream Corners\cream-corners.exe"
```

Ajusta la ruta al binario instalado: `C:\Program Files\Cream Corners\` con los instaladores per-machine, o `%LOCALAPPDATA%\Programs\Cream Corners\` si copiaste el exe a mano. Ejecutar desde PowerShell deja ver los errores que la UI reporta como `action-error`. En desarrollo, `npm run tauri dev` muestra esa salida en la misma consola.

---

Cream Corners está creado y mantenido por [Canopus44](https://github.com/Canopus44).
