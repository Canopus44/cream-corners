//! Runs a configured zone action. Keyboard shortcuts use `keybd_event`; other
//! presets either lock the workstation or open a shell target.

use crate::settings::{Action, Preset};
use crate::win32;
use std::process::Command;

const VK_LWIN: u8 = 0x5B;
const VK_LCONTROL: u8 = 0xA2;
const VK_LSHIFT: u8 = 0xA0;
const VK_MENU: u8 = 0x12;
const VK_TAB: u8 = 0x09;
const VK_ESCAPE: u8 = 0x1B;
const VK_LEFT: u8 = 0x25;
const VK_RIGHT: u8 = 0x27;
const VK_D: u8 = 0x44;
const VK_A: u8 = 0x41;
const VK_W: u8 = 0x57;
const VK_S: u8 = 0x53;
const VK_V: u8 = 0x56;
const VK_P: u8 = 0x50;
const VK_X: u8 = 0x58;

pub fn run(action: &Action) -> Result<(), String> {
    match action {
        Action::None => Ok(()),
        Action::Preset { id } => run_preset(*id),
        Action::Command { program, args } => {
            let program = program.trim();
            if program.is_empty() {
                return Err("El comando no tiene programa".to_string());
            }
            Command::new(program)
                .args(args.iter().map(String::as_str))
                .spawn()
                .map(|_| ())
                .map_err(|err| format!("No se pudo iniciar {program}: {err}"))
        }
        Action::Url { url } => {
            let url = url.trim();
            let lower = url.to_lowercase();
            let allowed = lower.starts_with("http://")
                || lower.starts_with("https://")
                || lower.starts_with("ms-")
                || lower.starts_with("shell:");
            if !allowed {
                return Err(format!("URL no permitida: {url}"));
            }
            open(url)
        }
    }
}

fn run_preset(preset: Preset) -> Result<(), String> {
    let keys: &[u8] = match preset {
        Preset::TaskView => &[VK_LWIN, VK_TAB],
        Preset::ShowDesktop => &[VK_LWIN, VK_D],
        Preset::StartMenu => &[VK_LCONTROL, VK_ESCAPE],
        Preset::ActionCenter => &[VK_LWIN, VK_A],
        Preset::Widgets => &[VK_LWIN, VK_W],
        Preset::Search => &[VK_LWIN, VK_S],
        Preset::ClipboardHistory => &[VK_LWIN, VK_V],
        Preset::ProjectMenu => &[VK_LWIN, VK_P],
        Preset::QuickLink => &[VK_LWIN, VK_X],
        Preset::DesktopLeft => &[VK_LWIN, VK_LCONTROL, VK_LEFT],
        Preset::DesktopRight => &[VK_LWIN, VK_LCONTROL, VK_RIGHT],
        Preset::AltTab => &[VK_MENU, VK_TAB],
        Preset::TaskManager => &[VK_LCONTROL, VK_LSHIFT, VK_ESCAPE],
        Preset::Lock => {
            win32::lock_workstation();
            return Ok(());
        }
        Preset::FileExplorer => return open("explorer.exe"),
        Preset::Settings => return open("ms-settings:"),
        Preset::ScreenSnip => return open("ms-screenclip:"),
    };

    win32::send_keys(keys);
    Ok(())
}

fn open(target: &str) -> Result<(), String> {
    if win32::shell_execute(target) {
        Ok(())
    } else {
        Err(format!("No se pudo abrir {target}"))
    }
}
