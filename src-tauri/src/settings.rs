//! Persisted settings: versioned JSON with defaults on every field so old or
//! partial files still load. Written atomically with a rolling backup.

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

pub const SETTINGS_VERSION: u32 = 1;

const SETTINGS_FILE: &str = "settings.json";
const BACKUP_FILE: &str = "settings.bak.json";
const TMP_FILE: &str = "settings.json.tmp";
const RUN_KEY: &str = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const AUTOSTART_NAME: &str = "CreamCorners";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MonitorScope {
    #[default]
    All,
    Primary,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Preset {
    #[default]
    TaskView,
    ShowDesktop,
    Lock,
    StartMenu,
    ActionCenter,
    Widgets,
    Search,
    ClipboardHistory,
    ProjectMenu,
    QuickLink,
    DesktopLeft,
    DesktopRight,
    FileExplorer,
    Settings,
    ScreenSnip,
    TaskManager,
    AltTab,
}

impl Preset {
    pub const ALL: [Preset; 17] = [
        Preset::TaskView,
        Preset::ShowDesktop,
        Preset::Lock,
        Preset::StartMenu,
        Preset::ActionCenter,
        Preset::Widgets,
        Preset::Search,
        Preset::ClipboardHistory,
        Preset::ProjectMenu,
        Preset::QuickLink,
        Preset::DesktopLeft,
        Preset::DesktopRight,
        Preset::FileExplorer,
        Preset::Settings,
        Preset::ScreenSnip,
        Preset::TaskManager,
        Preset::AltTab,
    ];

    pub fn id(self) -> &'static str {
        match self {
            Preset::TaskView => "task_view",
            Preset::ShowDesktop => "show_desktop",
            Preset::Lock => "lock",
            Preset::StartMenu => "start_menu",
            Preset::ActionCenter => "action_center",
            Preset::Widgets => "widgets",
            Preset::Search => "search",
            Preset::ClipboardHistory => "clipboard_history",
            Preset::ProjectMenu => "project_menu",
            Preset::QuickLink => "quick_link",
            Preset::DesktopLeft => "desktop_left",
            Preset::DesktopRight => "desktop_right",
            Preset::FileExplorer => "file_explorer",
            Preset::Settings => "settings",
            Preset::ScreenSnip => "screen_snip",
            Preset::TaskManager => "task_manager",
            Preset::AltTab => "alt_tab",
        }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    #[default]
    None,
    Preset {
        #[serde(default)]
        id: Preset,
    },
    Command {
        program: String,
        #[serde(default)]
        args: Vec<String>,
    },
    Url {
        url: String,
    },
}

impl Action {
    pub fn is_none(&self) -> bool {
        matches!(self, Action::None)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Zone {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    TopEdge,
    BottomEdge,
    LeftEdge,
    RightEdge,
}

impl Zone {
    pub const ALL: [Zone; 8] = [
        Zone::TopLeft,
        Zone::TopRight,
        Zone::BottomLeft,
        Zone::BottomRight,
        Zone::TopEdge,
        Zone::BottomEdge,
        Zone::LeftEdge,
        Zone::RightEdge,
    ];

    pub fn label(self) -> &'static str {
        match self {
            Zone::TopLeft => "Esquina superior izquierda",
            Zone::TopRight => "Esquina superior derecha",
            Zone::BottomLeft => "Esquina inferior izquierda",
            Zone::BottomRight => "Esquina inferior derecha",
            Zone::TopEdge => "Borde superior",
            Zone::BottomEdge => "Borde inferior",
            Zone::LeftEdge => "Borde izquierdo",
            Zone::RightEdge => "Borde derecho",
        }
    }

    pub fn is_corner(self) -> bool {
        matches!(
            self,
            Zone::TopLeft | Zone::TopRight | Zone::BottomLeft | Zone::BottomRight
        )
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ZoneBinding {
    pub enabled: bool,
    pub dwell_ms: Option<u64>,
    pub action: Action,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Zones {
    pub top_left: ZoneBinding,
    pub top_right: ZoneBinding,
    pub bottom_left: ZoneBinding,
    pub bottom_right: ZoneBinding,
    pub top_edge: ZoneBinding,
    pub bottom_edge: ZoneBinding,
    pub left_edge: ZoneBinding,
    pub right_edge: ZoneBinding,
}

impl Default for Zones {
    fn default() -> Self {
        let preset = |id: Preset| ZoneBinding {
            enabled: true,
            dwell_ms: None,
            action: Action::Preset { id },
        };
        Self {
            top_left: preset(Preset::TaskView),
            top_right: ZoneBinding::default(),
            bottom_left: preset(Preset::ShowDesktop),
            bottom_right: ZoneBinding {
                enabled: true,
                dwell_ms: Some(400),
                action: Action::Preset { id: Preset::Lock },
            },
            top_edge: ZoneBinding::default(),
            bottom_edge: ZoneBinding::default(),
            left_edge: ZoneBinding::default(),
            right_edge: ZoneBinding::default(),
        }
    }
}

impl Zones {
    pub fn get(&self, zone: Zone) -> &ZoneBinding {
        match zone {
            Zone::TopLeft => &self.top_left,
            Zone::TopRight => &self.top_right,
            Zone::BottomLeft => &self.bottom_left,
            Zone::BottomRight => &self.bottom_right,
            Zone::TopEdge => &self.top_edge,
            Zone::BottomEdge => &self.bottom_edge,
            Zone::LeftEdge => &self.left_edge,
            Zone::RightEdge => &self.right_edge,
        }
    }

    pub fn iter_mut(&mut self) -> impl Iterator<Item = &mut ZoneBinding> + '_ {
        [
            &mut self.top_left,
            &mut self.top_right,
            &mut self.bottom_left,
            &mut self.bottom_right,
            &mut self.top_edge,
            &mut self.bottom_edge,
            &mut self.left_edge,
            &mut self.right_edge,
        ]
        .into_iter()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub version: u32,
    pub enabled: bool,
    pub poll_interval_ms: u64,
    pub corner_size_px: i32,
    pub edge_size_px: i32,
    pub dwell_ms: u64,
    pub cooldown_ms: u64,
    pub ignore_dragging: bool,
    pub pause_on_fullscreen: bool,
    pub monitor_scope: MonitorScope,
    pub start_with_windows: bool,
    pub show_tray_notifications: bool,
    pub zones: Zones,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: SETTINGS_VERSION,
            enabled: true,
            poll_interval_ms: 40,
            corner_size_px: 6,
            edge_size_px: 4,
            dwell_ms: 220,
            cooldown_ms: 800,
            ignore_dragging: true,
            pause_on_fullscreen: true,
            monitor_scope: MonitorScope::All,
            start_with_windows: false,
            show_tray_notifications: true,
            zones: Zones::default(),
        }
    }
}

impl Settings {
    pub fn sanitize(&mut self) {
        self.version = SETTINGS_VERSION;
        self.poll_interval_ms = self.poll_interval_ms.clamp(15, 500);
        self.corner_size_px = self.corner_size_px.clamp(1, 64);
        self.edge_size_px = self.edge_size_px.clamp(1, 32);
        self.dwell_ms = self.dwell_ms.min(3000);
        self.cooldown_ms = self.cooldown_ms.min(10000);

        for binding in self.zones.iter_mut() {
            if let Some(dwell) = binding.dwell_ms {
                binding.dwell_ms = Some(dwell.min(3000));
            }

            match &mut binding.action {
                Action::Command { program, args } => {
                    *program = truncate(program.trim(), 2048);
                    args.truncate(32);
                    for arg in args.iter_mut() {
                        *arg = truncate(arg.trim(), 1024);
                    }
                }
                Action::Url { url } => {
                    *url = truncate(url.trim(), 2048);
                }
                Action::None | Action::Preset { .. } => {}
            }

            let empty = match &binding.action {
                Action::Command { program, .. } => program.is_empty(),
                Action::Url { url } => url.is_empty(),
                _ => false,
            };
            if empty {
                binding.action = Action::None;
            }
        }
    }
}

fn truncate(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

pub fn settings_dir() -> PathBuf {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("LOCALAPPDATA").map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("CreamCorners");
    if let Err(err) = fs::create_dir_all(&dir) {
        eprintln!("settings: could not create {}: {err}", dir.display());
    }
    dir
}

pub fn settings_path(dir: &Path) -> PathBuf {
    dir.join(SETTINGS_FILE)
}

pub fn load(dir: &Path) -> Settings {
    let path = settings_path(dir);

    match fs::read_to_string(&path) {
        Ok(text) => match serde_json::from_str::<Settings>(&text) {
            Ok(mut settings) => {
                settings.sanitize();
                settings
            }
            Err(err) => {
                eprintln!("settings: could not parse {}: {err}", path.display());
                quarantine(dir, &path);
                match read_backup(dir) {
                    Some(mut settings) => {
                        settings.sanitize();
                        settings
                    }
                    None => Settings::default(),
                }
            }
        },
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            let settings = Settings::default();
            if let Err(write_err) = save(&settings, dir) {
                eprintln!("settings: could not write defaults: {write_err}");
            }
            settings
        }
        Err(err) => {
            eprintln!("settings: could not read {}: {err}", path.display());
            match read_backup(dir) {
                Some(mut settings) => {
                    settings.sanitize();
                    settings
                }
                None => Settings::default(),
            }
        }
    }
}

fn read_backup(dir: &Path) -> Option<Settings> {
    let path = dir.join(BACKUP_FILE);
    let text = fs::read_to_string(&path).ok()?;
    match serde_json::from_str::<Settings>(&text) {
        Ok(settings) => Some(settings),
        Err(err) => {
            eprintln!("settings: could not parse {}: {err}", path.display());
            None
        }
    }
}

fn quarantine(dir: &Path, path: &Path) {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs())
        .unwrap_or(0);
    let target = dir.join(format!("settings.corrupt-{stamp}.json"));
    if let Err(err) = fs::rename(path, &target) {
        eprintln!("settings: could not move corrupt file: {err}");
    }
}

pub fn save(settings: &Settings, dir: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dir)?;

    let json = serde_json::to_vec_pretty(settings)
        .map_err(|err| std::io::Error::new(std::io::ErrorKind::InvalidData, err))?;
    let tmp = dir.join(TMP_FILE);
    let target = settings_path(dir);
    let backup = dir.join(BACKUP_FILE);

    {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(&json)?;
        file.sync_all()?;
    }

    if target.exists() {
        // A failed backup must not prevent writing the new settings.
        if let Err(err) = fs::copy(&target, &backup) {
            eprintln!("settings: could not refresh backup: {err}");
        }
    }

    let result = fs::rename(&tmp, &target);
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

pub fn autostart_set(enabled: bool) -> std::io::Result<()> {
    let exe = std::env::current_exe()?;
    let quoted = format!("\"{}\"", exe.display());

    let mut command = Command::new("reg");
    if enabled {
        command.args([
            "add",
            RUN_KEY,
            "/v",
            AUTOSTART_NAME,
            "/t",
            "REG_SZ",
            "/d",
            quoted.as_str(),
            "/f",
        ]);
    } else {
        command.args(["delete", RUN_KEY, "/v", AUTOSTART_NAME, "/f"]);
    }

    let output = command.output()?;
    if output.status.success() {
        return Ok(());
    }

    let text = format!(
        "{} {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
    .to_lowercase();

    // Deleting a value that is not registered is not an error.
    if !enabled
        && (text.contains("unable to find")
            || text.contains("was not found")
            || text.contains("no se pudo encontrar")
            || text.contains("no se puede encontrar")
            || text.contains("no se encuentra"))
    {
        return Ok(());
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::Other,
        format!("reg failed: {}", text.trim()),
    ))
}
