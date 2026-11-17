//! Tray icon and menu: toggle, open settings, quit.

use crate::engine::Engine;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Wry};

pub struct TrayHandles {
    pub enabled_item: CheckMenuItem<Wry>,
}

pub struct TrayRuntime(pub tauri::tray::TrayIcon<Wry>);

pub fn init(app: &AppHandle, engine: Arc<Engine>) -> tauri::Result<()> {
    let enabled = match engine.settings.read() {
        Ok(guard) => guard.enabled,
        Err(err) => err.into_inner().enabled,
    };

    let toggle = CheckMenuItem::with_id(app, "toggle", "Activo", true, enabled, None::<&str>)?;
    let open = MenuItem::with_id(app, "open", "Cambiar comandos", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &open, &separator, &quit])?;

    let _ = app.manage(TrayHandles {
        enabled_item: toggle.clone(),
    });

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("Cream Corners - clic para cambiar comandos")
        .menu(&menu)
        .show_menu_on_left_click(false);
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    let tray = builder
        .on_menu_event({
            let engine = engine.clone();
            let toggle = toggle.clone();
            move |app, event| match event.id.as_ref() {
                "toggle" => {
                    let current = match engine.settings.read() {
                        Ok(guard) => guard.enabled,
                        Err(err) => err.into_inner().enabled,
                    };
                    let next = !current;
                    let snapshot = match engine.settings.write() {
                        Ok(mut guard) => {
                            guard.enabled = next;
                            (*guard).clone()
                        }
                        Err(err) => {
                            let mut guard = err.into_inner();
                            guard.enabled = next;
                            (*guard).clone()
                        }
                    };
                    if let Err(err) = crate::settings::save(&snapshot, &engine.config_dir) {
                        eprintln!("tray: could not save settings: {err}");
                    }
                    if let Err(err) = toggle.set_checked(next) {
                        eprintln!("tray: could not update check item: {err}");
                    }
                    crate::engine::emit_status(app, engine.as_ref());
                }
                "open" => show_main(app),
                "quit" => {
                    if let Some(flag) = app.try_state::<Arc<AtomicBool>>() {
                        flag.store(true, Ordering::SeqCst);
                    }
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => show_main(tray.app_handle()),
            _ => {}
        })
        .build(app)?;
    let _ = app.manage(TrayRuntime(tray));

    Ok(())
}

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(err) = window.show() {
            eprintln!("tray: could not show window: {err}");
        }
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
