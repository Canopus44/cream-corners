#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let _instance = match cream_corners_lib::win32::acquire_singleton("Local\\CreamCornersSingleton") {
        Some(guard) => guard,
        None => std::process::exit(0),
    };

    cream_corners_lib::run();
}
