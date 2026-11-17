import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";

import type { Action, MonitorInfo, Preset, Settings, Status, ZoneBinding, ZoneKey } from "./types";
import "./style.css";

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

const PREVIEW = !("__TAURI_INTERNALS__" in window);
const SVG_NS = "http://www.w3.org/2000/svg";

interface Bridge {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;
  setEnabled(enabled: boolean): Promise<void>;
  runAction(action: Action): Promise<void>;
  getMonitors(): Promise<MonitorInfo[]>;
  getStatus(): Promise<Status>;
  resetSettings(): Promise<Settings>;
  openConfigDir(): Promise<void>;
  listenStatus(cb: (status: Status) => void): Promise<void>;
  listenActionError(cb: (message: string) => void): Promise<void>;
}

const tauriBridge: Bridge = {
  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings) => invoke<Settings>("save_settings", { settings }),
  setEnabled: (enabled) => invoke<void>("set_enabled", { enabled }),
  runAction: (action) => invoke<void>("run_action", { action }),
  getMonitors: () => invoke<MonitorInfo[]>("get_monitors"),
  getStatus: () => invoke<Status>("get_status"),
  resetSettings: () => invoke<Settings>("reset_settings"),
  openConfigDir: () => invoke<void>("open_config_dir"),
  listenStatus: async (cb) => {
    await listen<Status>("status-changed", (event) => cb(event.payload));
  },
  listenActionError: async (cb) => {
    await listen<{ message: string }>("action-error", (event) => cb(event.payload.message));
  },
};

const FAKE_MONITORS: MonitorInfo[] = [
  { id: 1, x: 0, y: 0, width: 1920, height: 1080, primary: true },
  { id: 2, x: 1920, y: 0, width: 2560, height: 1440, primary: false },
];

function previewBridge(): Bridge {
  let store = defaultSettings();
  const monitors = FAKE_MONITORS.map((monitor) => ({ ...monitor }));
  const status: Status = {
    enabled: store.enabled,
    pausedByFullscreen: false,
    monitorCount: monitors.length,
    configPath: "%APPDATA%\\CreamCorners\\settings.json",
  };
  return {
    getSettings: async () => structuredClone(store),
    saveSettings: async (settings) => {
      store = structuredClone(settings);
      return structuredClone(store);
    },
    setEnabled: async (enabled) => {
      store.enabled = enabled;
      status.enabled = enabled;
    },
    runAction: async () => undefined,
    getMonitors: async () => monitors.map((monitor) => ({ ...monitor })),
    getStatus: async () => ({ ...status }),
    resetSettings: async () => {
      store = defaultSettings();
      status.enabled = store.enabled;
      return structuredClone(store);
    },
    openConfigDir: async () => {
      throw new Error("No disponible en modo vista previa");
    },
    listenStatus: async () => undefined,
    listenActionError: async () => undefined,
  };
}

const bridge: Bridge = PREVIEW ? previewBridge() : tauriBridge;

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

function zone(action: Action, enabled = true, dwellMs: number | null = null): ZoneBinding {
  return { enabled, dwellMs, action };
}

function defaultSettings(): Settings {
  return {
    version: 1,
    enabled: true,
    pollIntervalMs: 40,
    cornerSizePx: 6,
    edgeSizePx: 4,
    dwellMs: 220,
    cooldownMs: 800,
    ignoreDragging: true,
    pauseOnFullscreen: true,
    monitorScope: "all",
    startWithWindows: false,
    showTrayNotifications: true,
    zones: {
      topLeft: zone({ type: "preset", id: "task_view" }),
      topRight: zone({ type: "none" }, false),
      bottomLeft: zone({ type: "preset", id: "show_desktop" }),
      bottomRight: zone({ type: "preset", id: "lock" }, true, 400),
      topEdge: zone({ type: "none" }, false),
      bottomEdge: zone({ type: "none" }, false),
      leftEdge: zone({ type: "none" }, false),
      rightEdge: zone({ type: "none" }, false),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const ICONS = {
  window: ["M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z", "M3 9.5h18"],
  grid: ["M4.5 4.5h6v6h-6z", "M13.5 4.5h6v6h-6z", "M4.5 13.5h6v6h-6z", "M13.5 13.5h6v6h-6z"],
  monitor: ["M3.5 5.5h17v10.5h-17z", "M9.5 20h5", "M12 16v4"],
  lock: ["M6.5 11h11v8.5h-11z", "M9.5 11V8.5a2.5 2.5 0 0 1 5 0V11"],
  search: ["M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z", "M20.5 20.5l-4-4"],
  clipboard: ["M8.5 5.5h7v14h-7z", "M9.5 3.5h5v3h-5z"],
  bolt: ["M13.5 3.5 6 13.5h5.5L10.5 20.5 18 10.5h-5.5z"],
  link: ["M10.5 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1.2 1.2", "M13.5 10.5a3.5 3.5 0 0 0-5 0L6 13a3.5 3.5 0 0 0 5 5l1.2-1.2"],
  none: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M6 6l12 12"],
  chevron: ["m9 6 6 6-6 6"],
  check: ["m5 12.5 4.5 4.5L19 7.5"],
  close: ["M6 6l12 12", "M18 6 6 18"],
} as const;

type IconName = keyof typeof ICONS;

function svg(viewBox: string, size: number, paths: readonly string[], className: string): SVGElement {
  const node = document.createElementNS(SVG_NS, "svg");
  node.setAttribute("viewBox", viewBox);
  node.setAttribute("width", String(size));
  node.setAttribute("height", String(size));
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("class", className);
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    node.append(path);
  }
  return node;
}

function icon(name: IconName, size = 18): SVGElement {
  return svg("0 0 24 24", size, ICONS[name], "icon");
}

function appMark(size = 38): SVGElement {
  const node = document.createElementNS(SVG_NS, "svg");
  node.setAttribute("viewBox", "0 0 40 40");
  node.setAttribute("width", String(size));
  node.setAttribute("height", String(size));
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("class", "app-mark");
  const box = document.createElementNS(SVG_NS, "rect");
  box.setAttribute("width", "40");
  box.setAttribute("height", "40");
  box.setAttribute("rx", "11");
  box.setAttribute("class", "app-mark__bg");
  const brackets = svg("0 0 40 40", size, ["M11 15v-4h4", "M29 15v-4h-4", "M11 25v4h4", "M29 25v4h-4"], "app-mark__ink");
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("cx", "20");
  dot.setAttribute("cy", "20");
  dot.setAttribute("r", "2.2");
  dot.setAttribute("fill", "#FFFCF6");
  node.append(box, brackets, dot);
  return node;
}

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

type Child = Node | string | null | undefined | false;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

interface ToggleOptions {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function toggleControl(options: ToggleOptions): HTMLButtonElement {
  const button = el("button", {
    type: "button",
    id: options.id,
    class: "switch" + (options.checked ? " is-on" : ""),
    role: "switch",
    "aria-checked": String(options.checked),
    "aria-label": options.label,
  });
  button.append(el("span", { class: "switch__thumb" }));
  button.addEventListener("click", () => {
    const next = button.getAttribute("aria-checked") !== "true";
    button.setAttribute("aria-checked", String(next));
    button.classList.toggle("is-on", next);
    options.onChange(next);
  });
  return button;
}

interface RowOptions {
  label: string;
  hint?: string;
  control: Node;
  id?: string;
}

function row(options: RowOptions): HTMLElement {
  return el("div", { class: "row" },
    el("div", { class: "row__text" },
      options.id
        ? el("label", { class: "row__label", for: options.id }, options.label)
        : el("span", { class: "row__label" }, options.label),
      options.hint ? el("span", { class: "row__hint" }, options.hint) : null,
    ),
    el("div", { class: "row__control" }, options.control),
  );
}

function navRow(options: { label: string; hint?: string; id: string; onClick: () => void; danger?: boolean }): HTMLButtonElement {
  const button = el("button", {
    type: "button",
    id: options.id,
    class: "row row--nav" + (options.danger ? " row--danger" : ""),
  },
    el("div", { class: "row__text" },
      el("span", { class: "row__label" }, options.label),
      options.hint ? el("span", { class: "row__hint" }, options.hint) : null,
    ),
    el("span", { class: "row__control" }, icon("chevron", 18)),
  );
  button.addEventListener("click", options.onClick);
  return button;
}

function section(title: string, ...children: Child[]): HTMLElement {
  return el("section", { class: "group", "aria-label": title },
    el("h3", { class: "group__label" }, title),
    el("div", { class: "card" }, ...children),
  );
}

interface SegmentOption { value: string; label: string }

interface SegmentedOptions {
  idPrefix: string;
  label: string;
  options: SegmentOption[];
  value: string;
  mode?: "tabs" | "radio";
  small?: boolean;
  onChange: (value: string) => void;
}

function segmented(options: SegmentedOptions): HTMLElement {
  const isTabs = options.mode === "tabs";
  const bar = el("div", {
    class: "segmented" + (options.small ? " segmented--sm" : ""),
    role: isTabs ? "tablist" : "radiogroup",
    "aria-label": options.label,
  });
  const buttons: HTMLButtonElement[] = [];
  for (const option of options.options) {
    const active = option.value === options.value;
    const button = el("button", {
      type: "button",
      id: `${options.idPrefix}-${option.value}`,
      class: "segmented__btn" + (active ? " is-active" : ""),
      role: isTabs ? "tab" : "radio",
      "aria-selected": isTabs ? String(active) : null,
      "aria-checked": isTabs ? null : String(active),
      "aria-controls": isTabs ? `pane-${option.value}` : null,
    });
    button.textContent = option.label;
    button.addEventListener("click", () => {
      for (const other of buttons) {
        const on = other === button;
        other.classList.toggle("is-active", on);
        other.setAttribute(isTabs ? "aria-selected" : "aria-checked", String(on));
      }
      options.onChange(option.value);
    });
    buttons.push(button);
    bar.append(button);
  }
  return bar;
}

interface SliderOptions {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  disabled?: boolean;
  hint?: string;
  onInput: (value: number) => void;
}

function sliderField(options: SliderOptions): HTMLElement {
  const output = el("output", { class: "slider-value", for: options.id });
  const input = el("input", {
    type: "range",
    id: options.id,
    class: "slider",
    min: String(options.min),
    max: String(options.max),
    step: String(options.step),
    value: String(options.value),
    "aria-label": options.label,
    disabled: options.disabled ?? false,
  });
  const paint = (): void => {
    const percent = ((Number(input.value) - options.min) / (options.max - options.min)) * 100;
    input.style.setProperty("--fill", `${percent}%`);
    output.textContent = `${input.value} ${options.unit}`;
  };
  input.addEventListener("input", () => {
    paint();
    options.onInput(Number(input.value));
  });
  paint();
  return el("div", { class: "field field--slider" },
    el("div", { class: "field__head" },
      el("label", { class: "field__label", for: options.id }, options.label),
      output,
    ),
    input,
    options.hint ? el("p", { class: "field__hint" }, options.hint) : null,
  );
}

/* ------------------------------------------------------------------ */
/* Preset catalog                                                      */
/* ------------------------------------------------------------------ */

type PresetGroup = "Ventanas" | "Escritorio" | "Sistema" | "Personalizado";

interface PresetInfo {
  id: Preset;
  name: string;
  desc: string;
  glyph: IconName;
  group: PresetGroup;
}

const PRESET_GROUPS: PresetGroup[] = ["Ventanas", "Escritorio", "Sistema", "Personalizado"];

const PRESETS: PresetInfo[] = [
  { id: "task_view", name: "Ver tareas", desc: "Vista de tareas de Windows", glyph: "window", group: "Ventanas" },
  { id: "alt_tab", name: "Cambiar de ventana", desc: "Conmutador Alt+Tab", glyph: "window", group: "Ventanas" },
  { id: "task_manager", name: "Administrador de tareas", desc: "Procesos y rendimiento", glyph: "bolt", group: "Ventanas" },
  { id: "screen_snip", name: "Recorte de pantalla", desc: "Herramienta de recorte", glyph: "window", group: "Ventanas" },
  { id: "show_desktop", name: "Mostrar escritorio", desc: "Minimiza todas las ventanas", glyph: "monitor", group: "Escritorio" },
  { id: "desktop_left", name: "Escritorio a la izquierda", desc: "Escritorio virtual anterior", glyph: "monitor", group: "Escritorio" },
  { id: "desktop_right", name: "Escritorio a la derecha", desc: "Escritorio virtual siguiente", glyph: "monitor", group: "Escritorio" },
  { id: "widgets", name: "Widgets", desc: "Panel de widgets", glyph: "grid", group: "Escritorio" },
  { id: "file_explorer", name: "Explorador de archivos", desc: "Abre el explorador", glyph: "window", group: "Escritorio" },
  { id: "start_menu", name: "Menú Inicio", desc: "Abre el menú Inicio", glyph: "grid", group: "Sistema" },
  { id: "action_center", name: "Centro de actividades", desc: "Notificaciones y accesos", glyph: "grid", group: "Sistema" },
  { id: "search", name: "Buscar", desc: "Búsqueda de Windows", glyph: "search", group: "Sistema" },
  { id: "clipboard_history", name: "Historial del portapapeles", desc: "Portapapeles de Windows (Win+V)", glyph: "clipboard", group: "Sistema" },
  { id: "lock", name: "Bloquear PC", desc: "Bloquea la sesión (Win+L)", glyph: "lock", group: "Sistema" },
  { id: "settings", name: "Configuración", desc: "Ajustes de Windows (Win+I)", glyph: "grid", group: "Sistema" },
  { id: "project_menu", name: "Menú de usuario", desc: "Menú de sistema (Win+X)", glyph: "window", group: "Sistema" },
  { id: "quick_link", name: "Enlaces rápidos", desc: "Menú de enlaces rápidos (Win+X)", glyph: "link", group: "Personalizado" },
];

const PRESET_MAP = new Map<Preset, PresetInfo>(PRESETS.map((preset) => [preset.id, preset] as const));

const ZONE_ORDER: ZoneKey[] = [
  "topLeft", "topRight", "bottomLeft", "bottomRight",
  "topEdge", "bottomEdge", "leftEdge", "rightEdge",
];

interface ZoneMeta { name: string; short: string; kind: "corner" | "edge"; pos: string }

const ZONE_META: Record<ZoneKey, ZoneMeta> = {
  topLeft: { name: "Esquina superior izquierda", short: "Esquina sup. izq.", kind: "corner", pos: "tl" },
  topRight: { name: "Esquina superior derecha", short: "Esquina sup. der.", kind: "corner", pos: "tr" },
  bottomLeft: { name: "Esquina inferior izquierda", short: "Esquina inf. izq.", kind: "corner", pos: "bl" },
  bottomRight: { name: "Esquina inferior derecha", short: "Esquina inf. der.", kind: "corner", pos: "br" },
  topEdge: { name: "Borde superior", short: "Borde superior", kind: "edge", pos: "top" },
  bottomEdge: { name: "Borde inferior", short: "Borde inferior", kind: "edge", pos: "bottom" },
  leftEdge: { name: "Borde izquierdo", short: "Borde izquierdo", kind: "edge", pos: "left" },
  rightEdge: { name: "Borde derecho", short: "Borde derecho", kind: "edge", pos: "right" },
};

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

let draft: Settings = defaultSettings();
let committed: Settings = structuredClone(draft);
let monitors: MonitorInfo[] = [];
let status: Status | null = null;
let appVersion = "0.1.0";
let activeTab = "zones";
let selectedZone: ZoneKey = "topLeft";
let saveState: "idle" | "saving" | "saved" = "idle";
let saveTimer = 0;
let savedTimer = 0;
let saveSeq = 0;

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

const toastHost = el("div", { class: "toast-host", role: "status", "aria-live": "polite" });
document.body.append(toastHost);

function toast(message: string, variant: "success" | "error" = "success"): void {
  const node = el("div", { class: `toast toast--${variant}` }, message);
  toastHost.append(node);
  window.setTimeout(() => {
    node.classList.add("is-out");
    window.setTimeout(() => node.remove(), 220);
  }, 2600);
}

function messageOf(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Se produjo un error inesperado";
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

interface SheetHandle {
  open(title: string, content: Node): void;
  close(): void;
  isOpen(): boolean;
}

function createSheet(): SheetHandle {
  const title = el("h2", { class: "sheet__title", id: "sheet-title" });
  const body = el("div", { class: "sheet__body" });
  const closeButton = el("button", { type: "button", id: "sheet-close", class: "icon-btn", "aria-label": "Cerrar" });
  closeButton.append(icon("close", 16));
  const dialog = el("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "sheet-title" },
    el("div", { class: "sheet__grabber", "aria-hidden": "true" }),
    el("div", { class: "sheet__head" }, title, closeButton),
    body,
  );
  const root = el("div", { class: "sheet-backdrop", "aria-hidden": "true" }, dialog);
  document.body.append(root);

  let isOpen = false;
  let lastFocused: HTMLElement | null = null;

  const setShellInert = (inert: boolean): void => {
    const shell = document.querySelector<HTMLElement>(".app-shell");
    if (!shell) return;
    if (inert) shell.setAttribute("inert", "");
    else shell.removeAttribute("inert");
  };

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    setShellInert(false);
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  };

  const open = (heading: string, content: Node): void => {
    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (current && !root.contains(current)) lastFocused = current;
    title.textContent = heading;
    body.replaceChildren(content);
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    isOpen = true;
    setShellInert(true);
    closeButton.focus();
  };

  closeButton.addEventListener("click", close);
  root.addEventListener("click", (event) => {
    if (event.target === root) close();
  });
  document.addEventListener("keydown", (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return { open, close, isOpen: () => isOpen };
}

const sheet = createSheet();

/* ------------------------------------------------------------------ */
/* Saving                                                              */
/* ------------------------------------------------------------------ */

function setSaveIndicator(state: "idle" | "saving" | "saved"): void {
  saveState = state;
  const node = document.querySelector<HTMLElement>(".save-state");
  if (!node) return;
  node.textContent = state === "saving" ? "Guardando…" : state === "saved" ? "Guardado" : "";
  node.classList.toggle("is-saving", state === "saving");
  node.classList.toggle("is-saved", state === "saved");
}

function markSaved(): void {
  setSaveIndicator("saved");
  window.clearTimeout(savedTimer);
  savedTimer = window.setTimeout(() => setSaveIndicator("idle"), 1800);
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  setSaveIndicator("saving");
  saveTimer = window.setTimeout(() => {
    void commit();
  }, 400);
}

async function commit(): Promise<void> {
  const seq = ++saveSeq;
  const sent = structuredClone(draft);
  const sentSnapshot = JSON.stringify(sent);
  try {
    const saved = await bridge.saveSettings(sent);
    committed = structuredClone(saved);
    if (seq === saveSeq && JSON.stringify(draft) === sentSnapshot) {
      draft = structuredClone(saved);
      markSaved();
    } else {
      setSaveIndicator("saving");
    }
    render();
  } catch (error) {
    if (seq !== saveSeq) return;
    const unchanged = JSON.stringify(draft) === sentSnapshot;
    if (unchanged) {
      draft = structuredClone(committed);
      setSaveIndicator("idle");
    }
    toast(messageOf(error), "error");
    render();
  }
}

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

function statusState(): { key: "on" | "paused" | "off"; label: string } {
  if (!draft.enabled) return { key: "off", label: "Desactivado" };
  if (status?.pausedByFullscreen) return { key: "paused", label: "Pausado" };
  return { key: "on", label: "Activo" };
}

function programName(program: string): string {
  const parts = program.split(/[\\/]/);
  return parts[parts.length - 1] || program;
}

function urlHost(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function actionSummary(action: Action): { label: string; meta: string } {
  switch (action.type) {
    case "none":
      return { label: "Sin acción", meta: "La zona no hará nada" };
    case "preset": {
      const preset = PRESET_MAP.get(action.id);
      return { label: preset?.name ?? "Preajuste", meta: preset?.desc ?? "" };
    }
    case "command":
      return { label: `Comando · ${programName(action.program)}`, meta: action.program };
    case "url":
      return { label: `URL · ${urlHost(action.url)}`, meta: action.url };
  }
}

function actionGlyph(action: Action): IconName {
  if (action.type === "command") return "bolt";
  if (action.type === "url") return "link";
  if (action.type === "none") return "none";
  return PRESET_MAP.get(action.id)?.glyph ?? "window";
}

/* ------------------------------------------------------------------ */
/* Control sync                                                        */
/* ------------------------------------------------------------------ */

function syncStatusPill(): void {
  const pill = document.querySelector<HTMLElement>(".status-pill");
  if (!pill) return;
  const state = statusState();
  pill.className = `status-pill is-${state.key}`;
  const text = pill.querySelector<HTMLElement>(".status-pill__text");
  if (text) text.textContent = state.label;
}

function syncEnabledSwitches(): void {
  for (const id of ["master-switch", "settings-enabled"]) {
    const node = document.getElementById(id);
    if (!node) continue;
    node.classList.toggle("is-on", draft.enabled);
    node.setAttribute("aria-checked", String(draft.enabled));
  }
}

function syncHotspots(): void {
  for (const key of ZONE_ORDER) {
    const node = document.querySelector<HTMLButtonElement>(`.hotspot[data-zone="${key}"]`);
    if (!node) continue;
    const enabled = draft.zones[key].enabled;
    node.classList.toggle("is-enabled", enabled);
    node.setAttribute("aria-label", `${ZONE_META[key].name}: ${enabled ? "activada" : "desactivada"}`);
  }
}

async function applyEnabled(next: boolean): Promise<void> {
  draft.enabled = next;
  syncEnabledSwitches();
  syncStatusPill();
  try {
    await bridge.setEnabled(next);
    committed.enabled = next;
  } catch (error) {
    draft.enabled = !next;
    syncEnabledSwitches();
    syncStatusPill();
    toast(messageOf(error), "error");
  }
}

async function refreshMonitors(): Promise<void> {
  try {
    monitors = await bridge.getMonitors();
    status = await bridge.getStatus();
    render();
    toast("Monitores actualizados", "success");
  } catch (error) {
    toast(messageOf(error), "error");
  }
}

async function resetAll(): Promise<void> {
  try {
    const settings = await bridge.resetSettings();
    window.clearTimeout(saveTimer);
    saveSeq += 1;
    draft = structuredClone(settings);
    committed = structuredClone(settings);
    sheet.close();
    setSaveIndicator("idle");
    render();
    toast("Valores restaurados", "success");
  } catch (error) {
    toast(messageOf(error), "error");
  }
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

const app = document.getElementById("app") as HTMLDivElement;

function render(): void {
  const focusedId = document.activeElement instanceof HTMLElement ? document.activeElement.id : "";
  app.replaceChildren(
    el("div", { class: "app-shell" },
      headerEl(),
      el("div", { class: "app-body" },
        PREVIEW ? el("div", { class: "preview-banner" }, "Modo vista previa (sin backend)") : null,
        el("nav", { class: "tab-bar", "aria-label": "Secciones" }, tabBar()),
        zonesPane(),
        settingsPane(),
        aboutPane(),
      ),
    ),
  );
  if (sheet.isOpen()) app.querySelector<HTMLElement>(".app-shell")?.setAttribute("inert", "");
  if (focusedId) {
    document.getElementById(focusedId)?.focus();
  }
}

function tabBar(): HTMLElement {
  return segmented({
    idPrefix: "tab",
    label: "Secciones",
    mode: "tabs",
    value: activeTab,
    options: [
      { value: "zones", label: "Zonas" },
      { value: "settings", label: "Ajustes" },
      { value: "about", label: "Acerca" },
    ],
    onChange: (value) => {
      if (value === activeTab) return;
      activeTab = value;
      render();
    },
  });
}

function headerEl(): HTMLElement {
  const state = statusState();
  const saveClass =
    "save-state" + (saveState === "saving" ? " is-saving" : saveState === "saved" ? " is-saved" : "");
  return el("header", { class: "app-header" },
    el("div", { class: "brand" },
      appMark(38),
      el("div", { class: "brand__text" },
        el("h1", { class: "brand__name" }, "Cream Corners"),
        el("p", { class: "brand__sub" }, "Hot corners para Windows"),
      ),
    ),
    el("div", { class: "header-controls" },
      el("span", { class: saveClass, role: "status", "aria-live": "polite" },
        saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado" : "",
      ),
      el("span", { class: `status-pill is-${state.key}` },
        el("span", { class: "status-pill__dot", "aria-hidden": "true" }),
        el("span", { class: "status-pill__text" }, state.label),
      ),
      toggleControl({
        id: "master-switch",
        label: "Activar Cream Corners",
        checked: draft.enabled,
        onChange: (next) => {
          void applyEnabled(next);
        },
      }),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Zonas                                                               */
/* ------------------------------------------------------------------ */

function paneProps(id: string): Record<string, unknown> {
  return {
    id: `pane-${id}`,
    role: "tabpanel",
    "aria-labelledby": `tab-${id}`,
    hidden: activeTab !== id,
  };
}

function zonesPane(): HTMLElement {
  return el("div", { ...paneProps("zones"), class: "zones-grid" }, mapCard(), zoneEditorCard());
}

function mapCard(): HTMLElement {
  const count = status?.monitorCount || monitors.length;
  const primary = monitors.find((monitor) => monitor.primary) ?? monitors[0];
  const map = el("div", { class: "screen-map", role: "group", "aria-label": "Mapa de zonas de la pantalla" });
  map.append(el("div", { class: "screen-map__chrome", "aria-hidden": "true" },
    el("strong", {}, "Pantalla principal"),
    el("span", {}, primary ? `${primary.width} × ${primary.height}` : "Sin datos del monitor"),
  ));

  for (const key of ZONE_ORDER) {
    const meta = ZONE_META[key];
    const binding = draft.zones[key];
    const hotspot = el("button", {
      type: "button",
      id: `zone-hotspot-${key}`,
      class:
        `hotspot hotspot--${meta.kind}` +
        (binding.enabled ? " is-enabled" : "") +
        (key === selectedZone ? " is-selected" : ""),
      "data-zone": key,
      "data-pos": meta.pos,
      "aria-label": `${meta.name}: ${binding.enabled ? "activada" : "desactivada"}`,
    });
    hotspot.append(el("span", { class: "hotspot__label", "aria-hidden": "true" }, meta.short));
    hotspot.addEventListener("click", () => {
      selectedZone = key;
      render();
      if (window.innerWidth <= 900) {
        document.getElementById("zone-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    map.append(hotspot);
  }

  const refresh = el("button", { type: "button", id: "refresh-monitors", class: "link-btn" }, "Actualizar monitores");
  refresh.addEventListener("click", () => {
    void refreshMonitors();
  });

  return el("section", { class: "card map-card", "aria-label": "Mapa de zonas" },
    map,
    el("div", { class: "map-caption" },
      el("span", {}, `${count} ${count === 1 ? "monitor" : "monitores"}`),
      refresh,
    ),
    el("p", { class: "map-legend" }, "8 zonas · Esquinas y bordes · Multi-monitor"),
  );
}

function zoneEditorCard(): HTMLElement {
  const meta = ZONE_META[selectedZone];
  const binding = draft.zones[selectedZone];
  const summary = actionSummary(binding.action);
  const usesGlobal = binding.dwellMs === null;

  const enabledToggle = toggleControl({
    id: "zone-enabled",
    label: `Activar ${meta.name}`,
    checked: binding.enabled,
    onChange: (next) => {
      binding.enabled = next;
      syncHotspots();
      scheduleSave();
    },
  });

  const actionButton = el("button", {
    type: "button",
    id: "zone-action",
    class: "action-row",
    "aria-label": `Elegir acción para ${meta.name}`,
  });
  actionButton.append(
    el("span", { class: "action-row__glyph" }, icon(actionGlyph(binding.action), 20)),
    el("span", { class: "action-row__text" },
      el("span", { class: "action-row__label" }, summary.label),
      el("span", { class: "action-row__meta" }, summary.meta),
    ),
    el("span", { class: "action-row__chevron" }, icon("chevron", 18)),
  );
  actionButton.addEventListener("click", () => openActionPicker(selectedZone));

  const dwell = sliderField({
    id: "zone-dwell",
    label: "Demora",
    min: 0,
    max: 1500,
    step: 5,
    value: binding.dwellMs ?? draft.dwellMs,
    unit: "ms",
    disabled: usesGlobal,
    hint: usesGlobal ? "Usando la demora global." : "Demora específica de esta zona.",
    onInput: (value) => {
      binding.dwellMs = value;
      scheduleSave();
    },
  });

  const globalToggle = toggleControl({
    id: "zone-dwell-global",
    label: `Usar demora global en ${meta.name}`,
    checked: usesGlobal,
    onChange: (next) => {
      binding.dwellMs = next ? null : draft.dwellMs;
      scheduleSave();
      render();
    },
  });

  const testButton = el("button", {
    type: "button",
    id: "zone-test",
    class: "btn btn--filled btn--block",
    disabled: binding.action.type === "none",
  }, "Probar");
  testButton.addEventListener("click", () => {
    void runZoneAction(selectedZone);
  });

  return el("section", { class: "card zone-editor", id: "zone-editor", "aria-labelledby": "zone-editor-title" },
    el("div", { class: "card__head" },
      el("div", { class: "card__head-main" },
        el("h2", { class: "card__title", id: "zone-editor-title" }, meta.name),
        el("span", { class: "chip" }, meta.kind === "corner" ? "Esquina" : "Borde"),
      ),
    ),
    row({ id: "zone-enabled", label: "Activada", hint: "Responde al entrar en la zona", control: enabledToggle }),
    actionButton,
    dwell,
    row({ id: "zone-dwell-global", label: "Usar valor global", hint: "Ignora la demora de esta zona", control: globalToggle }),
    el("div", { class: "zone-editor__footer" }, testButton),
  );
}

async function runZoneAction(key: ZoneKey): Promise<void> {
  const action = draft.zones[key].action;
  if (action.type === "none") return;
  try {
    await bridge.runAction(action);
    toast("Acción enviada", "success");
  } catch (error) {
    toast(messageOf(error), "error");
  }
}

/* ------------------------------------------------------------------ */
/* Action picker + custom editor                                       */
/* ------------------------------------------------------------------ */

interface PickRowOptions {
  glyph: IconName;
  name: string;
  desc: string;
  current?: boolean;
  onPick: () => void;
}

function pickRow(options: PickRowOptions): HTMLButtonElement {
  const button = el("button", {
    type: "button",
    class: "pick-row" + (options.current ? " is-current" : ""),
    "aria-current": options.current ? "true" : null,
  },
    el("span", { class: "pick-row__glyph" }, icon(options.glyph, 17)),
    el("span", { class: "pick-row__text" },
      el("span", { class: "pick-row__name" }, options.name),
      el("span", { class: "pick-row__desc" }, options.desc),
    ),
    options.current ? el("span", { class: "pick-row__check" }, icon("check", 16)) : null,
  );
  button.addEventListener("click", options.onPick);
  return button;
}

function setZoneAction(key: ZoneKey, action: Action): void {
  draft.zones[key].action = action;
  sheet.close();
  scheduleSave();
  render();
}

function openActionPicker(key: ZoneKey): void {
  const current = draft.zones[key].action;
  const content = el("div", {});

  for (const group of PRESET_GROUPS) {
    if (group === "Personalizado") continue;
    const card = el("div", { class: "sheet-group-card" });
    for (const preset of PRESETS.filter((item) => item.group === group)) {
      card.append(pickRow({
        glyph: preset.glyph,
        name: preset.name,
        desc: preset.desc,
        current: current.type === "preset" && current.id === preset.id,
        onPick: () => setZoneAction(key, { type: "preset", id: preset.id }),
      }));
    }
    content.append(el("p", { class: "sheet-group" }, group), card);
  }

  const customCard = el("div", { class: "sheet-group-card" });
  for (const preset of PRESETS.filter((item) => item.group === "Personalizado")) {
    customCard.append(pickRow({
      glyph: preset.glyph,
      name: preset.name,
      desc: preset.desc,
      current: current.type === "preset" && current.id === preset.id,
      onPick: () => setZoneAction(key, { type: "preset", id: preset.id }),
    }));
  }
  customCard.append(
    pickRow({
      glyph: "none",
      name: "Sin acción",
      desc: "La zona no hará nada",
      current: current.type === "none",
      onPick: () => setZoneAction(key, { type: "none" }),
    }),
    pickRow({
      glyph: "bolt",
      name: "Comando personalizado",
      desc: "Ejecuta un programa con argumentos",
      onPick: () => openCustomEditor(key, "command"),
    }),
    pickRow({
      glyph: "link",
      name: "URL personalizada",
      desc: "Abre una URL o protocolo del sistema",
      onPick: () => openCustomEditor(key, "url"),
    }),
  );
  content.append(el("p", { class: "sheet-group" }, "Personalizado"), customCard);
  sheet.open("Elegir acción", content);
}

function textField(id: string, label: string, hint: string, input: HTMLInputElement): HTMLElement {
  return el("div", { class: "field" },
    el("label", { class: "field__label", for: id }, label),
    input,
    el("p", { class: "form-hint" }, hint),
  );
}

function openCustomEditor(key: ZoneKey, initialKind: "command" | "url"): void {
  const current = draft.zones[key].action;
  let kind = initialKind;

  const programInput = el("input", {
    type: "text",
    id: "custom-program",
    class: "text-input",
    placeholder: "C:\\Windows\\System32\\notepad.exe",
    autocomplete: "off",
  });
  const argsInput = el("input", {
    type: "text",
    id: "custom-args",
    class: "text-input",
    placeholder: "archivo.txt",
    autocomplete: "off",
  });
  const urlInput = el("input", {
    type: "text",
    id: "custom-url",
    class: "text-input",
    placeholder: "https://make.powerapps.com",
    autocomplete: "off",
  });
  if (current.type === "command") {
    programInput.value = current.program;
    argsInput.value = current.args.join(" ");
  } else if (current.type === "url") {
    urlInput.value = current.url;
  }

  const fields = el("div", { class: "form-fields" });
  const error = el("p", { class: "form-error", role: "alert" });

  const paintFields = (): void => {
    error.textContent = "";
    if (kind === "command") {
      fields.replaceChildren(
        textField("custom-program", "Programa", "Ruta o nombre del ejecutable.", programInput),
        textField("custom-args", "Argumentos", "Separa los argumentos con espacios.", argsInput),
      );
    } else {
      fields.replaceChildren(
        textField("custom-url", "URL", "Debe empezar por http, https, ms- o shell:.", urlInput),
      );
    }
  };

  const kindControl = segmented({
    idPrefix: "custom-kind",
    label: "Tipo de acción",
    mode: "radio",
    small: true,
    value: kind,
    options: [
      { value: "command", label: "Comando" },
      { value: "url", label: "URL" },
    ],
    onChange: (value) => {
      kind = value === "command" ? "command" : "url";
      paintFields();
    },
  });

  const applyButton = el("button", { type: "button", id: "custom-apply", class: "btn btn--filled" }, "Aplicar");
  applyButton.addEventListener("click", () => {
    error.textContent = "";
    if (kind === "command") {
      const program = programInput.value.trim();
      if (!program) {
        error.textContent = "Indica el programa a ejecutar.";
        programInput.focus();
        return;
      }
      const rawArgs = argsInput.value.trim();
      setZoneAction(key, { type: "command", program, args: rawArgs ? rawArgs.split(/\s+/) : [] });
      return;
    }
    const url = urlInput.value.trim();
    if (!/^(https?:\/\/|ms-|shell:)/i.test(url)) {
      error.textContent = "La URL debe empezar por http, https, ms- o shell:.";
      urlInput.focus();
      return;
    }
    setZoneAction(key, { type: "url", url });
  });

  paintFields();
  sheet.open("Acción personalizada", el("div", { class: "custom-editor" },
    kindControl,
    fields,
    error,
    el("div", { class: "sheet-actions" }, applyButton),
  ));
  (kind === "command" ? programInput : urlInput).focus();
}

function openResetSheet(): void {
  const cancel = el("button", { type: "button", id: "reset-cancel", class: "btn btn--soft" }, "Cancelar");
  const confirm = el("button", { type: "button", id: "reset-confirm", class: "btn btn--danger" }, "Restaurar");
  cancel.addEventListener("click", () => sheet.close());
  confirm.addEventListener("click", () => {
    void resetAll();
  });
  sheet.open("Restaurar valores", el("div", {},
    el("p", { class: "sheet-note" },
      "Se restaurarán todas las zonas, demoras y preferencias a sus valores iniciales. Esta acción no se puede deshacer.",
    ),
    el("div", { class: "sheet-actions" }, cancel, confirm),
  ));
}

/* ------------------------------------------------------------------ */
/* Ajustes                                                             */
/* ------------------------------------------------------------------ */

type NumericKey = "pollIntervalMs" | "cornerSizePx" | "edgeSizePx" | "dwellMs" | "cooldownMs";

function boolRow(
  id: string,
  label: string,
  hint: string | undefined,
  checked: boolean,
  onChange: (next: boolean) => void,
): HTMLElement {
  return row({ id, label, hint, control: toggleControl({ id, label, checked, onChange }) });
}

function settingSlider(
  key: NumericKey,
  label: string,
  unit: string,
  min: number,
  max: number,
  step: number,
  hint?: string,
): HTMLElement {
  return sliderField({
    id: `opt-${key}`,
    label,
    unit,
    min,
    max,
    step,
    value: draft[key],
    hint,
    onInput: (value) => {
      draft[key] = value;
      scheduleSave();
    },
  });
}

async function openConfigDir(): Promise<void> {
  try {
    await bridge.openConfigDir();
    toast("Carpeta abierta", "success");
  } catch (error) {
    toast(messageOf(error), "error");
  }
}

function settingsPane(): HTMLElement {
  const behavior = section("Comportamiento",
    boolRow("settings-enabled", "Activo", "Activa o pausa la detección", draft.enabled, (next) => {
      void applyEnabled(next);
    }),
    boolRow("opt-ignoreDragging", "Ignorar arrastre", "No activa zonas mientras arrastras", draft.ignoreDragging, (next) => {
      draft.ignoreDragging = next;
      scheduleSave();
    }),
    boolRow("opt-pauseOnFullscreen", "Pausar en pantalla completa", "Silencia las zonas con apps a pantalla completa", draft.pauseOnFullscreen, (next) => {
      draft.pauseOnFullscreen = next;
      scheduleSave();
    }),
    boolRow("opt-startWithWindows", "Iniciar con Windows", "Arranca minimizado en la bandeja", draft.startWithWindows, (next) => {
      draft.startWithWindows = next;
      scheduleSave();
    }),
  );

  const performance = section("Rendimiento",
    settingSlider("pollIntervalMs", "Intervalo de sondeo", "ms", 15, 200, 5, "Más bajo = más preciso, más CPU"),
    settingSlider("cornerSizePx", "Tamaño de esquina", "px", 2, 24, 1),
    settingSlider("edgeSizePx", "Tamaño de borde", "px", 2, 24, 1),
  );

  const activation = section("Activación",
    settingSlider("dwellMs", "Demora global", "ms", 0, 1500, 5),
    settingSlider("cooldownMs", "Enfriamiento", "ms", 0, 3000, 50, "Evita que la acción se repita al volver a la zona"),
  );

  const scope = segmented({
    idPrefix: "scope",
    label: "Alcance de pantallas",
    mode: "radio",
    small: true,
    value: draft.monitorScope,
    options: [
      { value: "all", label: "Todas" },
      { value: "primary", label: "Principal" },
    ],
    onChange: (value) => {
      draft.monitorScope = value === "primary" ? "primary" : "all";
      scheduleSave();
    },
  });
  const screens = section("Pantallas",
    row({ label: "Pantallas vigiladas", hint: "Dónde se activan las zonas", control: scope }),
  );

  const system = section("Sistema",
    navRow({
      id: "open-config",
      label: "Abrir carpeta de configuración",
      hint: status?.configPath,
      onClick: () => {
        void openConfigDir();
      },
    }),
    navRow({
      id: "reset-settings",
      label: "Restaurar valores por defecto",
      hint: "Vuelve a la configuración inicial",
      danger: true,
      onClick: openResetSheet,
    }),
  );

  return el("section", { ...paneProps("settings"), class: "settings-pane" },
    behavior, performance, activation, screens, system,
  );
}

/* ------------------------------------------------------------------ */
/* Acerca                                                              */
/* ------------------------------------------------------------------ */

function aboutPane(): HTMLElement {
  const hero = el("div", { class: "about__hero" },
    appMark(64),
    el("h2", { class: "about__name" }, "Cream Corners"),
    el("p", { class: "about__version" }, `Versión ${appVersion}`),
    el("p", { class: "about__desc" },
      "Zonas activas para Windows 10 y 11. Al llevar el cursor a una esquina o borde de la pantalla, " +
      "Cream Corners ejecuta la acción que elijas, con demora y enfriamiento configurables.",
    ),
  );

  const steps = [
    "Mueve el cursor a una esquina o borde del monitor.",
    "Espera la demora de la zona o la demora global.",
    "La acción se ejecuta una vez por entrada en la zona.",
  ];
  const howItWorks = section("Cómo funciona", ...steps.map((text, index) =>
    el("div", { class: "row row--steps" },
      el("span", { class: "row__index", "aria-hidden": "true" }, String(index + 1)),
      el("div", { class: "row__text" }, el("span", { class: "row__label" }, text)),
    ),
  ));

  const shortcuts: Array<{ keys: string[]; text: string }> = [
    { keys: ["Esc"], text: "Cierra la hoja abierta" },
    { keys: ["Tab"], text: "Recorre los controles" },
    { keys: ["←", "→"], text: "Ajusta el control deslizante" },
  ];
  const shortcutRows = section("Atajos", ...shortcuts.map((item) =>
    el("div", { class: "row" },
      el("div", { class: "row__text" }, el("span", { class: "row__label" }, item.text)),
      el("div", { class: "row__control" }, ...item.keys.map((key) => el("kbd", {}, key))),
    ),
  ));

  const footer = el("footer", { class: "about-footer" },
    el("span", {}, "Licencia MIT"),
    el("span", {},
      "Inspirado en ",
      el("a", { href: "https://github.com/flexits/HotCornersWin", target: "_blank", rel: "noreferrer noopener" }, "HotCornersWin"),
    ),
  );

  return el("section", { ...paneProps("about"), class: "about" }, hero, howItWorks, shortcutRows, footer);
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot(): Promise<void> {
  render();
  const [settingsResult, monitorsResult, statusResult] = await Promise.allSettled([
    bridge.getSettings(),
    bridge.getMonitors(),
    bridge.getStatus(),
  ]);
  draft = settingsResult.status === "fulfilled" ? settingsResult.value : defaultSettings();
  committed = structuredClone(draft);
  monitors = monitorsResult.status === "fulfilled" ? monitorsResult.value : [];
  status = statusResult.status === "fulfilled" ? statusResult.value : null;

  if (!PREVIEW) {
    try {
      appVersion = await getVersion();
    } catch {
      // usa la versión de reserva
    }
  }

  render();

  if (settingsResult.status === "rejected") toast("No se pudo cargar la configuración", "error");

  bridge.listenStatus((next) => {
    status = { ...(status ?? {}), ...next };
    if (typeof next.enabled === "boolean") {
      draft.enabled = next.enabled;
      committed.enabled = next.enabled;
    }
    render();
  }).catch(() => undefined);

  bridge.listenActionError((message) => toast(message, "error")).catch(() => undefined);
}

void boot();



