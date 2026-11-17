export type Preset =
  | "task_view" | "show_desktop" | "lock" | "start_menu" | "action_center"
  | "widgets" | "search" | "clipboard_history" | "project_menu" | "quick_link"
  | "desktop_left" | "desktop_right" | "file_explorer" | "settings"
  | "screen_snip" | "task_manager" | "alt_tab";

export type Action =
  | { type: "none" }
  | { type: "preset"; id: Preset }
  | { type: "command"; program: string; args: string[] }
  | { type: "url"; url: string };

export type ZoneKey =
  | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
  | "topEdge" | "bottomEdge" | "leftEdge" | "rightEdge";

export interface ZoneBinding { enabled: boolean; dwellMs: number | null; action: Action; }

export type MonitorScope = "all" | "primary";

export interface Settings {
  version: number;
  enabled: boolean;
  pollIntervalMs: number;
  cornerSizePx: number;
  edgeSizePx: number;
  dwellMs: number;
  cooldownMs: number;
  ignoreDragging: boolean;
  pauseOnFullscreen: boolean;
  monitorScope: MonitorScope;
  startWithWindows: boolean;
  showTrayNotifications: boolean;
  zones: Record<ZoneKey, ZoneBinding>;
}

export interface MonitorInfo { id: number; x: number; y: number; width: number; height: number; primary: boolean; }
export interface Status { enabled: boolean; pausedByFullscreen: boolean; monitorCount: number; configPath: string; }
