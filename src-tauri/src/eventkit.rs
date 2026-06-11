use chrono::{DateTime, Local};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use tauri::{AppHandle, Runtime};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccessStatus {
    Granted,
    Denied,
    Restricted,
    NotDetermined,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IntegrationStatus {
    pub calendar: AccessStatus,
    pub reminders: AccessStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SystemCalendarEvent {
    pub id: String,
    pub title: String,
    pub starts_at: DateTime<Local>,
    pub ends_at: DateTime<Local>,
    pub calendar_title: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SystemReminder {
    pub id: String,
    pub title: String,
    pub due_at: Option<DateTime<Local>>,
    pub done: bool,
    pub list_title: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SystemAgendaSnapshot {
    pub integration_status: IntegrationStatus,
    pub calendar_events: Vec<SystemCalendarEvent>,
    pub reminders: Vec<SystemReminder>,
}

pub trait SystemAgendaAdapter {
    fn snapshot(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<SystemAgendaSnapshot, String>;
    fn create_reminder(
        &self,
        title: &str,
        due_at: Option<DateTime<Local>>,
    ) -> Result<SystemReminder, String>;
    fn set_reminder_completed(&self, id: &str, done: bool) -> Result<SystemReminder, String>;
}

pub struct EventKitService<A> {
    adapter: A,
}

impl<A> EventKitService<A>
where
    A: SystemAgendaAdapter,
{
    pub fn new(adapter: A) -> Self {
        Self { adapter }
    }

    pub fn snapshot(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<SystemAgendaSnapshot, String> {
        self.adapter.snapshot(start, end)
    }

    pub fn create_reminder(
        &self,
        title: &str,
        due_at: Option<DateTime<Local>>,
    ) -> Result<SystemReminder, String> {
        self.adapter.create_reminder(title, due_at)
    }

    pub fn set_reminder_completed(&self, id: &str, done: bool) -> Result<SystemReminder, String> {
        self.adapter.set_reminder_completed(id, done)
    }
}

#[cfg(target_os = "macos")]
pub fn load_snapshot<R: Runtime>(
    app: &AppHandle<R>,
    start: DateTime<Local>,
    end: DateTime<Local>,
) -> Result<SystemAgendaSnapshot, String> {
    EventKitService::new(MacEventKitAdapter::new(app)?).snapshot(start, end)
}

#[cfg(not(target_os = "macos"))]
pub fn load_snapshot<R: Runtime>(
    _app: &AppHandle<R>,
    _start: DateTime<Local>,
    _end: DateTime<Local>,
) -> Result<SystemAgendaSnapshot, String> {
    Ok(SystemAgendaSnapshot {
        integration_status: IntegrationStatus {
            calendar: AccessStatus::Error,
            reminders: AccessStatus::Error,
        },
        calendar_events: Vec::new(),
        reminders: Vec::new(),
    })
}

#[cfg(target_os = "macos")]
pub fn set_system_reminder_completed<R: Runtime>(
    app: &AppHandle<R>,
    id: &str,
    done: bool,
) -> Result<SystemReminder, String> {
    EventKitService::new(MacEventKitAdapter::new(app)?).set_reminder_completed(id, done)
}

#[cfg(target_os = "macos")]
pub fn create_system_reminder<R: Runtime>(
    app: &AppHandle<R>,
    title: &str,
    due_at: Option<DateTime<Local>>,
) -> Result<SystemReminder, String> {
    EventKitService::new(MacEventKitAdapter::new(app)?).create_reminder(title, due_at)
}

#[cfg(not(target_os = "macos"))]
pub fn set_system_reminder_completed<R: Runtime>(
    _app: &AppHandle<R>,
    _id: &str,
    _done: bool,
) -> Result<SystemReminder, String> {
    Err("EventKit is only available on macOS".to_string())
}

#[cfg(not(target_os = "macos"))]
pub fn create_system_reminder<R: Runtime>(
    _app: &AppHandle<R>,
    _title: &str,
    _due_at: Option<DateTime<Local>>,
) -> Result<SystemReminder, String> {
    Err("EventKit is only available on macOS".to_string())
}

#[cfg(target_os = "macos")]
#[repr(C)]
struct NativeEventKitResult {
    json: *mut c_char,
    error: *mut c_char,
}

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn gd_eventkit_snapshot(start_iso: *const c_char, end_iso: *const c_char) -> NativeEventKitResult;
    fn gd_eventkit_create_reminder(title: *const c_char, due_at_iso: *const c_char) -> NativeEventKitResult;
    fn gd_eventkit_set_reminder_completed(identifier: *const c_char, done: c_int) -> NativeEventKitResult;
    fn gd_eventkit_free_string(string: *mut c_char);
}

#[cfg(target_os = "macos")]
struct MacEventKitAdapter;

#[cfg(target_os = "macos")]
impl MacEventKitAdapter {
    fn new<R: Runtime>(_app: &AppHandle<R>) -> Result<Self, String> {
        Ok(Self)
    }

    fn read_native_result<T>(result: NativeEventKitResult) -> Result<T, String>
    where
        T: DeserializeOwned,
    {
        let error = if result.error.is_null() {
            None
        } else {
            let value = unsafe { CStr::from_ptr(result.error) }
                .to_string_lossy()
                .into_owned();
            unsafe { gd_eventkit_free_string(result.error) };
            Some(value)
        };

        let json = if result.json.is_null() {
            None
        } else {
            let value = unsafe { CStr::from_ptr(result.json) }
                .to_string_lossy()
                .into_owned();
            unsafe { gd_eventkit_free_string(result.json) };
            Some(value)
        };

        if let Some(error) = error {
            return Err(error);
        }

        let payload = json.ok_or_else(|| "EventKit bridge returned no payload".to_string())?;
        serde_json::from_str(&payload)
            .map_err(|error| format!("Unable to decode EventKit bridge response: {error}; payload={payload}"))
    }
}

#[cfg(target_os = "macos")]
impl SystemAgendaAdapter for MacEventKitAdapter {
    fn snapshot(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<SystemAgendaSnapshot, String> {
        let start_iso = CString::new(start.to_rfc3339()).map_err(|error| error.to_string())?;
        let end_iso = CString::new(end.to_rfc3339()).map_err(|error| error.to_string())?;
        Self::read_native_result(unsafe { gd_eventkit_snapshot(start_iso.as_ptr(), end_iso.as_ptr()) })
    }

    fn create_reminder(
        &self,
        title: &str,
        due_at: Option<DateTime<Local>>,
    ) -> Result<SystemReminder, String> {
        let title = CString::new(title).map_err(|error| error.to_string())?;
        let due_at = due_at
            .map(|value| CString::new(value.to_rfc3339()).map_err(|error| error.to_string()))
            .transpose()?;

        Self::read_native_result(unsafe {
            gd_eventkit_create_reminder(
                title.as_ptr(),
                due_at.as_ref().map(|value| value.as_ptr()).unwrap_or(std::ptr::null()),
            )
        })
    }

    fn set_reminder_completed(&self, id: &str, done: bool) -> Result<SystemReminder, String> {
        let id = CString::new(id).map_err(|error| error.to_string())?;
        Self::read_native_result(unsafe {
            gd_eventkit_set_reminder_completed(id.as_ptr(), if done { 1 } else { 0 })
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{
        AccessStatus, EventKitService, IntegrationStatus, SystemAgendaAdapter, SystemAgendaSnapshot,
        SystemReminder,
    };
    use chrono::{Local, TimeZone};

    struct FakeAdapter {
        snapshot: Option<SystemAgendaSnapshot>,
        reminder: Option<SystemReminder>,
        fail_with: Option<String>,
    }

    impl SystemAgendaAdapter for FakeAdapter {
        fn snapshot(
            &self,
            _start: chrono::DateTime<Local>,
            _end: chrono::DateTime<Local>,
        ) -> Result<SystemAgendaSnapshot, String> {
            if let Some(error) = &self.fail_with {
                return Err(error.clone());
            }

            self.snapshot
                .clone()
                .ok_or_else(|| "missing snapshot".to_string())
        }

        fn create_reminder(
            &self,
            _title: &str,
            _due_at: Option<chrono::DateTime<Local>>,
        ) -> Result<SystemReminder, String> {
            if let Some(error) = &self.fail_with {
                return Err(error.clone());
            }

            self.reminder
                .clone()
                .ok_or_else(|| "missing reminder".to_string())
        }

        fn set_reminder_completed(&self, _id: &str, _done: bool) -> Result<SystemReminder, String> {
            if let Some(error) = &self.fail_with {
                return Err(error.clone());
            }

            self.reminder
                .clone()
                .ok_or_else(|| "missing reminder".to_string())
        }
    }

    #[test]
    fn eventkit_service_returns_snapshot_from_adapter() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: Some(SystemAgendaSnapshot {
                integration_status: IntegrationStatus {
                    calendar: AccessStatus::Granted,
                    reminders: AccessStatus::Granted,
                },
                calendar_events: Vec::new(),
                reminders: vec![SystemReminder {
                    id: "reminder-1".to_string(),
                    title: "Review timeline merge".to_string(),
                    due_at: Some(Local.with_ymd_and_hms(2026, 6, 10, 14, 0, 0).unwrap()),
                    done: false,
                    list_title: Some("Work".to_string()),
                }],
            }),
            reminder: None,
            fail_with: None,
        });

        let snapshot = service
            .snapshot(
                Local.with_ymd_and_hms(2026, 6, 10, 0, 0, 0).unwrap(),
                Local.with_ymd_and_hms(2026, 6, 17, 0, 0, 0).unwrap(),
            )
            .unwrap();

        assert_eq!(snapshot.integration_status.calendar, AccessStatus::Granted);
        assert_eq!(snapshot.reminders.len(), 1);
        assert_eq!(snapshot.reminders[0].title, "Review timeline merge");
    }

    #[test]
    fn eventkit_service_supports_empty_permission_denied_snapshot() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: Some(SystemAgendaSnapshot {
                integration_status: IntegrationStatus {
                    calendar: AccessStatus::Denied,
                    reminders: AccessStatus::Denied,
                },
                calendar_events: Vec::new(),
                reminders: Vec::new(),
            }),
            reminder: None,
            fail_with: None,
        });

        let snapshot = service
            .snapshot(
                Local.with_ymd_and_hms(2026, 6, 10, 0, 0, 0).unwrap(),
                Local.with_ymd_and_hms(2026, 6, 17, 0, 0, 0).unwrap(),
            )
            .unwrap();

        assert_eq!(snapshot.integration_status.reminders, AccessStatus::Denied);
        assert!(snapshot.calendar_events.is_empty());
        assert!(snapshot.reminders.is_empty());
    }

    #[test]
    fn eventkit_service_creates_reminder_from_adapter() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: None,
            reminder: Some(SystemReminder {
                id: "reminder-2".to_string(),
                title: "Create reminder bridge".to_string(),
                due_at: Some(Local.with_ymd_and_hms(2026, 6, 10, 18, 0, 0).unwrap()),
                done: false,
                list_title: Some("Reminders".to_string()),
            }),
            fail_with: None,
        });

        let reminder = service
            .create_reminder(
                "Create reminder bridge",
                Some(Local.with_ymd_and_hms(2026, 6, 10, 18, 0, 0).unwrap()),
            )
            .unwrap();

        assert_eq!(reminder.title, "Create reminder bridge");
        assert!(!reminder.done);
    }

    #[test]
    fn eventkit_service_propagates_adapter_failures() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: None,
            reminder: None,
            fail_with: Some("permission request failed".to_string()),
        });

        let error = service
            .snapshot(
                Local.with_ymd_and_hms(2026, 6, 10, 0, 0, 0).unwrap(),
                Local.with_ymd_and_hms(2026, 6, 17, 0, 0, 0).unwrap(),
            )
            .unwrap_err();

        assert!(error.contains("permission request failed"));
    }
}
