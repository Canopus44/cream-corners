//! Cream Corners - tray-resident hot corners for Windows 10/11.

pub mod actions;
pub mod engine;
pub mod settings;
pub mod tray;
pub mod win32;

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, RwLock};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};

use crate::engine::Engine;
use crate::settings::{Action, Settings};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub enabled: bool,
    pub paused_by_fullscreen: bool,
    pub monitor_count: usize,
    pub config_path: String,
}

#[derive(serde::Serialize)]
pub struct MonitorOut {
    pub id: isize,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub primary: bool,
}

pub fn run() {
    let config_dir = settings::settings_dir();
    let mut loaded = settings::load(&config_dir);
    loaded.sanitize();

    if let Err(err) = settings::autostart_set(loaded.start_with_windows) {
        eprintln!("autostart: {err}");
    }

    let engine = Arc::new(Engine {
        settings: Arc::new(RwLock::new(loaded)),
        paused_by_fullscreen: Arc::new(AtomicBool::new(false)),
        monitor_count: Arc::new(AtomicUsize::new(0)),
        config_dir,
    });

    let builder = tauri::Builder::default()
        .manage(engine.clone())
        .manage(Arc::new(AtomicBool::new(false)))
        .setup({
            let engine = engine.clone();
            move |app| {
                let handle = app.handle().clone();
                crate::engine::spawn(handle.clone(), engine.clone());
                tray::init(&handle, engine.clone())?;
                Ok(())
            }
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let quitting = window
                    .try_state::<Arc<AtomicBool>>()
                    .map(|flag| flag.load(Ordering::SeqCst))
                    .unwrap_or(false);
                if !quitting {
                    api.prevent_close();
                    if let Err(err) = window.hide() {
                        eprintln!("window: could not hide: {err}");
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            set_enabled,
            run_action,
            get_monitors,
            get_status,
            reset_settings,
            open_config_dir
        ]);

    if let Err(err) = builder.run(tauri::generate_context!()) {
        eprintln!("fatal: {err}");
    }
}

fn read_settings(engine: &Engine) -> Settings {
    match engine.settings.read() {
        Ok(guard) => (*guard).clone(),
        Err(err) => (*err.into_inner()).clone(),
    }
}

fn persist(app: &AppHandle, engine: &Engine, mut next: Settings) -> Result<Settings, String> {
    next.sanitize();

    let previous = match engine.settings.read() {
        Ok(guard) => guard.start_with_windows,
        Err(err) => err.into_inner().start_with_windows,
    };

    settings::save(&next, &engine.config_dir)
        .map_err(|err| format!("No se pudo guardar la configuración: {err}"))?;

    if previous != next.start_with_windows {
        if let Err(err) = settings::autostart_set(next.start_with_windows) {
            eprintln!("autostart: {err}");
        }
    }

    match engine.settings.write() {
        Ok(mut guard) => *guard = next.clone(),
        Err(err) => {
            let mut guard = err.into_inner();
            *guard = next.clone();
        }
    }

    if let Some(handles) = app.try_state::<tray::TrayHandles>() {
        if let Err(err) = handles.enabled_item.set_checked(next.enabled) {
            eprintln!("tray: could not update check item: {err}");
        }
    }
    crate::engine::emit_status(app, engine);

    Ok(next)
}

#[tauri::command]
fn get_settings(state: State<'_, Arc<Engine>>) -> Result<Settings, String> {
    Ok(read_settings(&state))
}

#[tauri::command]
fn save_settings(
    settings: Settings,
    app: AppHandle,
    state: State<'_, Arc<Engine>>,
) -> Result<Settings, String> {
    persist(&app, &state, settings)
}

#[tauri::command]
fn set_enabled(
    enabled: bool,
    app: AppHandle,
    state: State<'_, Arc<Engine>>,
) -> Result<Settings, String> {
    let mut next = read_settings(&state);
    next.enabled = enabled;
    persist(&app, &state, next)
}

#[tauri::command]
fn run_action(action: Action, app: AppHandle) -> Result<(), String> {
    std::thread::Builder::new()
        .name("cream-corners-action".to_string())
        .spawn(move || {
            if let Err(message) = actions::run(&action) {
                eprintln!("action error: {message}");
                let payload = serde_json::json!({ "message": message });
                if let Err(err) = app.emit("action-error", payload) {
                    eprintln!("action: could not emit action-error: {err}");
                }
            }
        })
        .map(|_| ())
        .map_err(|err| format!("No se pudo ejecutar la acción: {err}"))
}

#[tauri::command]
fn get_monitors() -> Result<Vec<MonitorOut>, String> {
    Ok(win32::monitors()
        .into_iter()
        .map(|monitor| MonitorOut {
            id: monitor.id,
            x: monitor.x,
            y: monitor.y,
            width: monitor.width,
            height: monitor.height,
            primary: monitor.primary,
        })
        .collect())
}

#[tauri::command]
fn get_status(state: State<'_, Arc<Engine>>) -> Result<Status, String> {
    Ok(Status {
        enabled: read_settings(&state).enabled,
        paused_by_fullscreen: state.paused_by_fullscreen.load(Ordering::Relaxed),
        monitor_count: state.monitor_count.load(Ordering::Relaxed),
        config_path: settings::settings_path(&state.config_dir)
            .to_string_lossy()
            .into_owned(),
    })
}

#[tauri::command]
fn reset_settings(app: AppHandle, state: State<'_, Arc<Engine>>) -> Result<Settings, String> {
    persist(&app, &state, Settings::default())
}

#[tauri::command]
fn open_config_dir(state: State<'_, Arc<Engine>>) -> Result<(), String> {
    let path = state.config_dir.to_string_lossy().into_owned();
    if win32::shell_execute(&path) {
        Ok(())
    } else {
        Err("No se pudo abrir la carpeta de configuración".to_string())
    }
}
