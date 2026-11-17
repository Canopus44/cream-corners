//! Minimal raw Win32 bindings (user32 / kernel32 / shell32) for x64 Windows.
//! Only the calls this app needs are declared; all wrappers are safe.

use std::ffi::c_void;

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct POINT {
    pub x: i32,
    pub y: i32,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct RECT {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct MONITORINFO {
    pub cb_size: u32,
    pub rc_monitor: RECT,
    pub rc_work: RECT,
    pub dw_flags: u32,
}

pub const MONITORINFOF_PRIMARY: u32 = 1;

const MONITOR_DEFAULTTONEAREST: u32 = 2;
const ERROR_ALREADY_EXISTS: u32 = 183;
const KEYEVENTF_KEYUP: u32 = 0x0002;
const SW_SHOWNORMAL: i32 = 1;
const EVENT_MODIFY_STATE: u32 = 0x0002;
const INFINITE: u32 = 0xFFFF_FFFF;
const VK_LBUTTON: i32 = 0x01;
const VK_RBUTTON: i32 = 0x02;
const VK_MBUTTON: i32 = 0x04;
const VK_XBUTTON1: i32 = 0x05;
const VK_XBUTTON2: i32 = 0x06;
/// Pixel tolerance when comparing window rect against monitor rect.
const FULLSCREEN_TOLERANCE: i32 = 2;

type MonitorEnumProc = Option<unsafe extern "system" fn(isize, isize, *mut RECT, isize) -> i32>;

#[link(name = "user32")]
#[link(name = "shell32")]
extern "system" {
    fn GetCursorPos(point: *mut POINT) -> i32;
    fn GetAsyncKeyState(vk: i32) -> i16;
    fn EnumDisplayMonitors(
        hdc: isize,
        clip: *const RECT,
        callback: MonitorEnumProc,
        data: isize,
    ) -> i32;
    fn GetMonitorInfoW(monitor: isize, info: *mut MONITORINFO) -> i32;
    fn MonitorFromWindow(window: isize, flags: u32) -> isize;
    fn GetForegroundWindow() -> isize;
    fn GetWindowRect(window: isize, rect: *mut RECT) -> i32;
    fn IsWindowVisible(window: isize) -> i32;
    fn GetClassNameW(window: isize, buffer: *mut u16, max: i32) -> i32;
    fn LockWorkStation() -> i32;
    fn keybd_event(vk: u8, scan: u8, flags: u32, extra: usize);
    fn ShellExecuteW(
        window: isize,
        operation: *const u16,
        file: *const u16,
        parameters: *const u16,
        directory: *const u16,
        show: i32,
    ) -> isize;
    fn CreateMutexW(attributes: *mut c_void, owner: i32, name: *const u16) -> isize;
    fn CreateEventW(
        attributes: *mut c_void,
        manual_reset: i32,
        initial_state: i32,
        name: *const u16,
    ) -> isize;
    fn OpenEventW(access: u32, inherit: i32, name: *const u16) -> isize;
    fn SetEvent(handle: isize) -> i32;
    fn WaitForSingleObject(handle: isize, milliseconds: u32) -> u32;
    fn CloseHandle(handle: isize) -> i32;
    fn SetLastError(error: u32);
    fn GetLastError() -> u32;
}

/// NUL-terminated UTF-16 buffer for `*W` APIs.
pub fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[derive(Clone, Debug)]
pub struct Monitor {
    pub id: isize,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub primary: bool,
}

pub fn cursor_pos() -> Option<(i32, i32)> {
    let mut point = POINT::default();
    if unsafe { GetCursorPos(&mut point) } != 0 {
        Some((point.x, point.y))
    } else {
        None
    }
}

pub fn mouse_button_down() -> bool {
    [VK_LBUTTON, VK_RBUTTON, VK_MBUTTON, VK_XBUTTON1, VK_XBUTTON2]
        .iter()
        .any(|vk| unsafe { (GetAsyncKeyState(*vk) as u16) & 0x8000 != 0 })
}

unsafe extern "system" fn collect_monitor(
    monitor: isize,
    _hdc: isize,
    _clip: *mut RECT,
    data: isize,
) -> i32 {
    let out = &mut *(data as *mut Vec<Monitor>);
    let mut info = MONITORINFO {
        cb_size: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    if GetMonitorInfoW(monitor, &mut info) != 0 {
        out.push(Monitor {
            id: monitor,
            x: info.rc_monitor.left,
            y: info.rc_monitor.top,
            width: info.rc_monitor.right - info.rc_monitor.left,
            height: info.rc_monitor.bottom - info.rc_monitor.top,
            primary: info.dw_flags & MONITORINFOF_PRIMARY != 0,
        });
    }
    1
}

pub fn monitors() -> Vec<Monitor> {
    let mut monitors: Vec<Monitor> = Vec::new();
    let data = &mut monitors as *mut Vec<Monitor> as isize;
    unsafe {
        EnumDisplayMonitors(0, std::ptr::null(), Some(collect_monitor), data);
    }
    monitors
}

pub fn foreground_is_fullscreen() -> bool {
    unsafe {
        let window = GetForegroundWindow();
        if window == 0 || IsWindowVisible(window) == 0 {
            return false;
        }

        let mut class_buffer = [0u16; 256];
        let class_len = GetClassNameW(window, class_buffer.as_mut_ptr(), class_buffer.len() as i32);
        if class_len <= 0 {
            return false;
        }
        let class_name = String::from_utf16_lossy(&class_buffer[..class_len as usize]);
        if matches!(
            class_name.as_str(),
            "Progman" | "WorkerW" | "Shell_TrayWnd"
        ) {
            return false;
        }

        let mut window_rect = RECT::default();
        if GetWindowRect(window, &mut window_rect) == 0 {
            return false;
        }

        let monitor = MonitorFromWindow(window, MONITOR_DEFAULTTONEAREST);
        if monitor == 0 {
            return false;
        }

        let mut info = MONITORINFO {
            cb_size: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if GetMonitorInfoW(monitor, &mut info) == 0 {
            return false;
        }

        let screen = info.rc_monitor;
        within(window_rect.left, screen.left)
            && within(window_rect.top, screen.top)
            && within(window_rect.right, screen.right)
            && within(window_rect.bottom, screen.bottom)
    }
}

fn within(a: i32, b: i32) -> bool {
    (a - b).abs() <= FULLSCREEN_TOLERANCE
}

pub fn lock_workstation() {
    unsafe {
        LockWorkStation();
    }
}

/// Press modifiers, tap the final key, release modifiers in reverse order.
/// The last element of `keys` is the tap; the rest are held modifiers.
pub fn send_keys(keys: &[u8]) {
    if keys.is_empty() {
        return;
    }
    let last = keys[keys.len() - 1];
    let modifiers = &keys[..keys.len() - 1];
    unsafe {
        for vk in modifiers {
            keybd_event(*vk, 0, 0, 0);
            key_delay();
        }
        keybd_event(last, 0, 0, 0);
        key_delay();
        keybd_event(last, 0, KEYEVENTF_KEYUP, 0);
        key_delay();
        for vk in modifiers.iter().rev() {
            keybd_event(*vk, 0, KEYEVENTF_KEYUP, 0);
            key_delay();
        }
    }
}

fn key_delay() {
    std::thread::sleep(std::time::Duration::from_millis(15));
}

pub fn shell_execute(target: &str) -> bool {
    let operation = wide("open");
    let file = wide(target);
    let result = unsafe {
        ShellExecuteW(
            0,
            operation.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    };
    result > 32
}

/// Held for the process lifetime; `None` means another instance owns the mutex.
pub struct InstanceGuard {
    handle: isize,
}

impl Drop for InstanceGuard {
    fn drop(&mut self) {
        if self.handle != 0 {
            unsafe {
                CloseHandle(self.handle);
            }
        }
    }
}

pub fn acquire_singleton(name: &str) -> Option<InstanceGuard> {
    let name = wide(name);
    unsafe {
        SetLastError(0);
        let handle = CreateMutexW(std::ptr::null_mut(), 1, name.as_ptr());
        if handle == 0 {
            eprintln!("single instance: CreateMutexW failed, continuing without a guard");
            return Some(InstanceGuard { handle: 0 });
        }
        if GetLastError() == ERROR_ALREADY_EXISTS {
            CloseHandle(handle);
            return None;
        }
        Some(InstanceGuard { handle })
    }
}

/// Auto-reset event the running instance waits on to show its window.
pub struct ShowEvent(isize);

impl ShowEvent {
    pub fn create(name: &str) -> Option<ShowEvent> {
        let name = wide(name);
        let handle = unsafe { CreateEventW(std::ptr::null_mut(), 0, 0, name.as_ptr()) };
        if handle == 0 {
            None
        } else {
            Some(ShowEvent(handle))
        }
    }

    pub fn wait(&self) -> bool {
        unsafe { WaitForSingleObject(self.0, INFINITE) == 0 }
    }
}

impl Drop for ShowEvent {
    fn drop(&mut self) {
        if self.0 != 0 {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
}

/// Best effort: ask an already-running instance to show its window.
pub fn signal_running_instance(name: &str) -> bool {
    let name = wide(name);
    unsafe {
        let handle = OpenEventW(EVENT_MODIFY_STATE, 0, name.as_ptr());
        if handle == 0 {
            return false;
        }
        let signaled = SetEvent(handle) != 0;
        CloseHandle(handle);
        signaled
    }
}
