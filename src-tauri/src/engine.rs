//! Mouse watcher. Runs on its own thread, reads a settings snapshot each tick,
//! and spawns actions so a slow command never stalls polling.

use crate::actions;
use crate::settings::{MonitorScope, Settings, Zone};
use crate::win32;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const FULLSCREEN_CHECK: Duration = Duration::from_millis(500);
const MONITOR_REFRESH: Duration = Duration::from_secs(1);

pub struct Engine {
    pub settings: Arc<RwLock<Settings>>,
    pub paused_by_fullscreen: Arc<AtomicBool>,
    pub monitor_count: Arc<AtomicUsize>,
    pub config_dir: PathBuf,
}

#[derive(Clone, Copy)]
struct ActiveZone {
    zone: Zone,
    monitor: isize,
    since: Instant,
}

pub fn spawn(app: AppHandle, engine: Arc<Engine>) {
    let builder = std::thread::Builder::new().name("cream-corners-poller".to_string());
    if let Err(err) = builder.spawn(move || poll_loop(app, engine)) {
        eprintln!("engine: could not start poller: {err}");
    }
}

fn poll_loop(app: AppHandle, engine: Arc<Engine>) {
    let mut current: Option<ActiveZone> = None;
    let mut fired = false;
    let mut last_fire: Option<Instant> = None;
    let mut monitors: Vec<win32::Monitor> = Vec::new();
    let mut last_monitor_refresh = Instant::now() - MONITOR_REFRESH;
    let mut last_fullscreen_check = Instant::now() - FULLSCREEN_CHECK;
    let mut dragged = false;

    loop {
        let settings = match engine.settings.read() {
            Ok(guard) => (*guard).clone(),
            Err(err) => (*err.into_inner()).clone(),
        };
        let interval = Duration::from_millis(settings.poll_interval_ms);

        if !settings.enabled {
            reset(&mut current, &mut fired);
            engine.paused_by_fullscreen.store(false, Ordering::Relaxed);
            std::thread::sleep(interval);
            continue;
        }

        if last_fullscreen_check.elapsed() >= FULLSCREEN_CHECK {
            last_fullscreen_check = Instant::now();
            let paused = settings.pause_on_fullscreen && win32::foreground_is_fullscreen();
            if engine.paused_by_fullscreen.swap(paused, Ordering::Relaxed) != paused {
                emit_status(&app, &engine);
            }
        }
        if engine.paused_by_fullscreen.load(Ordering::Relaxed) {
            reset(&mut current, &mut fired);
            std::thread::sleep(interval);
            continue;
        }

        if settings.ignore_dragging && win32::mouse_button_down() {
            dragged = true;
            reset(&mut current, &mut fired);
            std::thread::sleep(interval);
            continue;
        }

        if last_monitor_refresh.elapsed() >= MONITOR_REFRESH {
            last_monitor_refresh = Instant::now();
            monitors = win32::monitors();
            let previous = engine.monitor_count.swap(monitors.len(), Ordering::Relaxed);
            if previous != monitors.len() {
                emit_status(&app, &engine);
            }
        }

        let Some((x, y)) = win32::cursor_pos() else {
            reset(&mut current, &mut fired);
            std::thread::sleep(interval);
            continue;
        };

        let Some((zone, monitor)) = hit_test(&monitors, x, y, &settings) else {
            dragged = false;
            reset(&mut current, &mut fired);
            std::thread::sleep(interval);
            continue;
        };

        // Stay armed-off until the cursor leaves all zones, so dropping a
        // window in a corner does not immediately fire the action.
        if dragged {
            reset(&mut current, &mut fired);
            std::thread::sleep(interval);
            continue;
        }

        let now = Instant::now();
        let same_zone = current.map_or(false, |active| {
            active.zone == zone && active.monitor == monitor
        });

        if !same_zone {
            current = Some(ActiveZone {
                zone,
                monitor,
                since: now,
            });
            fired = false;
        } else if !fired {
            let dwell = Duration::from_millis(effective_dwell(&settings, zone));
            let cooldown = Duration::from_millis(settings.cooldown_ms);
            let cooled = last_fire.map_or(true, |at| now.duration_since(at) >= cooldown);
            let entered = current.map_or(now, |active| active.since);

            if cooled && now.duration_since(entered) >= dwell {
                fired = true;
                last_fire = Some(now);
                let action = settings.zones.get(zone).action.clone();
                let action_app = app.clone();
                let spawned = std::thread::Builder::new()
                    .name("cream-corners-action".to_string())
                    .spawn(move || {
                        if let Err(message) = actions::run(&action) {
                            eprintln!("action error: {message}");
                            let payload = serde_json::json!({ "message": message });
                            if let Err(err) = action_app.emit("action-error", payload) {
                                eprintln!("engine: could not emit action-error: {err}");
                            }
                        }
                    });
                if let Err(err) = spawned {
                    eprintln!("engine: could not spawn action: {err}");
                }
            }
        }

        std::thread::sleep(interval);
    }
}

fn reset(current: &mut Option<ActiveZone>, fired: &mut bool) {
    *current = None;
    *fired = false;
}

fn effective_dwell(settings: &Settings, zone: Zone) -> u64 {
    settings
        .zones
        .get(zone)
        .dwell_ms
        .unwrap_or(settings.dwell_ms)
}

fn is_active(settings: &Settings, zone: Zone) -> bool {
    let binding = settings.zones.get(zone);
    binding.enabled && !binding.action.is_none()
}

fn hit_test(monitors: &[win32::Monitor], x: i32, y: i32, settings: &Settings) -> Option<(Zone, isize)> {
    let corner = settings.corner_size_px;
    let edge = settings.edge_size_px;

    for monitor in monitors {
        if settings.monitor_scope == MonitorScope::Primary && !monitor.primary {
            continue;
        }

        let left = monitor.x;
        let top = monitor.y;
        let right = monitor.x + monitor.width;
        let bottom = monitor.y + monitor.height;
        if x < left || x >= right || y < top || y >= bottom {
            continue;
        }

        // Corners win over edges, so adjacent edge zones never steal a corner.
        let corners = [
            (Zone::TopLeft, left, top),
            (Zone::TopRight, right - 1, top),
            (Zone::BottomLeft, left, bottom - 1),
            (Zone::BottomRight, right - 1, bottom - 1),
        ];
        for (zone, corner_x, corner_y) in corners {
            if (x - corner_x).abs() <= corner
                && (y - corner_y).abs() <= corner
                && is_active(settings, zone)
            {
                return Some((zone, monitor.id));
            }
        }

        let edges = [
            (Zone::TopEdge, y - top),
            (Zone::BottomEdge, bottom - 1 - y),
            (Zone::LeftEdge, x - left),
            (Zone::RightEdge, right - 1 - x),
        ];
        for (zone, distance) in edges {
            if distance <= edge && is_active(settings, zone) {
                return Some((zone, monitor.id));
            }
        }
    }

    None
}

pub fn emit_status(app: &AppHandle, engine: &Engine) {
    let enabled = match engine.settings.read() {
        Ok(guard) => guard.enabled,
        Err(err) => err.into_inner().enabled,
    };
    let config_path = crate::settings::settings_path(&engine.config_dir)
        .to_string_lossy()
        .into_owned();
    let payload = serde_json::json!({
        "enabled": enabled,
        "pausedByFullscreen": engine.paused_by_fullscreen.load(Ordering::Relaxed),
        "monitorCount": engine.monitor_count.load(Ordering::Relaxed),
        "configPath": config_path,
    });
    if let Err(err) = app.emit("status-changed", payload) {
        eprintln!("engine: could not emit status-changed: {err}");
    }
}
