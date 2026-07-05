use chrono::{DateTime, Local};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
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
#[serde(rename_all = "camelCase")]
pub struct IntegrationStatus {
    pub calendar: AccessStatus,
    pub reminders: AccessStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemCalendarEvent {
    pub id: String,
    pub title: String,
    #[serde(alias = "starts_at")]
    pub starts_at: DateTime<Local>,
    #[serde(alias = "ends_at")]
    pub ends_at: DateTime<Local>,
    #[serde(alias = "calendar_title")]
    pub calendar_title: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemReminder {
    pub id: String,
    pub title: String,
    #[serde(alias = "due_at")]
    pub due_at: Option<DateTime<Local>>,
    pub done: bool,
    #[serde(alias = "list_title")]
    pub list_title: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemAgendaSnapshot {
    #[serde(alias = "integration_status")]
    pub integration_status: IntegrationStatus,
    #[serde(alias = "calendar_events")]
    pub calendar_events: Vec<SystemCalendarEvent>,
    #[serde(alias = "reminders")]
    pub reminders: Vec<SystemReminder>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarRangeData {
    pub events: Vec<SystemCalendarEvent>,
    pub reminders: Vec<SystemReminder>,
}

pub trait SystemAgendaAdapter {
    fn snapshot(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<SystemAgendaSnapshot, String>;
    fn load_range(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<CalendarRangeData, String>;
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

    pub fn load_range(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<CalendarRangeData, String> {
        self.adapter.load_range(start, end)
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
pub fn load_calendar_range<R: Runtime>(
    app: &AppHandle<R>,
    start: DateTime<Local>,
    end: DateTime<Local>,
) -> Result<CalendarRangeData, String> {
    EventKitService::new(MacEventKitAdapter::new(app)?).load_range(start, end)
}

#[cfg(not(target_os = "macos"))]
pub fn load_calendar_range<R: Runtime>(
    _app: &AppHandle<R>,
    _start: DateTime<Local>,
    _end: DateTime<Local>,
) -> Result<CalendarRangeData, String> {
    Ok(CalendarRangeData {
        events: Vec::new(),
        reminders: Vec::new(),
    })
}

#[cfg(target_os = "macos")]
#[repr(C)]
struct NativeEventKitResult {
    json: *mut c_char,
    error: *mut c_char,
}

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn gd_eventkit_snapshot(
        start_iso: *const c_char,
        end_iso: *const c_char,
    ) -> NativeEventKitResult;
    fn gd_eventkit_request_calendar_access_async(
        context: *mut std::ffi::c_void,
        callback: unsafe extern "C" fn(*mut std::ffi::c_void, *const c_char),
    );
    fn gd_eventkit_request_reminders_access_async(
        context: *mut std::ffi::c_void,
        callback: unsafe extern "C" fn(*mut std::ffi::c_void, *const c_char),
    );
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
        let result: T = serde_json::from_str(&payload).map_err(|error| {
            format!("Unable to decode EventKit bridge response: {error}; payload={payload}")
        })?;
        Ok(result)
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
        Self::read_native_result(unsafe {
            gd_eventkit_snapshot(start_iso.as_ptr(), end_iso.as_ptr())
        })
    }

    fn load_range(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<CalendarRangeData, String> {
        let start_iso = CString::new(start.to_rfc3339()).map_err(|error| error.to_string())?;
        let end_iso = CString::new(end.to_rfc3339()).map_err(|error| error.to_string())?;
        Self::read_native_result(unsafe {
            gd_eventkit_snapshot(start_iso.as_ptr(), end_iso.as_ptr())
        })
        .map(|snapshot: SystemAgendaSnapshot| CalendarRangeData {
            events: snapshot.calendar_events,
            reminders: snapshot.reminders,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{
        AccessStatus, EventKitService, IntegrationStatus, SystemAgendaAdapter,
        SystemAgendaSnapshot, SystemReminder,
    };
    use chrono::{Local, TimeZone};

    struct FakeAdapter {
        snapshot: Option<SystemAgendaSnapshot>,
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

        fn load_range(
            &self,
            _start: chrono::DateTime<Local>,
            _end: chrono::DateTime<Local>,
        ) -> Result<super::CalendarRangeData, String> {
            if let Some(error) = &self.fail_with {
                return Err(error.clone());
            }

            let snapshot = self
                .snapshot
                .clone()
                .ok_or_else(|| "missing snapshot".to_string())?;

            Ok(super::CalendarRangeData {
                events: snapshot.calendar_events,
                reminders: snapshot.reminders,
            })
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
    fn eventkit_service_propagates_adapter_failures() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: None,
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

    #[test]
    fn eventkit_service_loads_calendar_range() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: Some(SystemAgendaSnapshot {
                integration_status: IntegrationStatus {
                    calendar: AccessStatus::Granted,
                    reminders: AccessStatus::Granted,
                },
                calendar_events: vec![
                    super::SystemCalendarEvent {
                        id: "event-1".to_string(),
                        title: "Week 1 Event".to_string(),
                        starts_at: Local.with_ymd_and_hms(2026, 6, 10, 10, 0, 0).unwrap(),
                        ends_at: Local.with_ymd_and_hms(2026, 6, 10, 11, 0, 0).unwrap(),
                        calendar_title: Some("Work".to_string()),
                    },
                    super::SystemCalendarEvent {
                        id: "event-2".to_string(),
                        title: "Week 2 Event".to_string(),
                        starts_at: Local.with_ymd_and_hms(2026, 6, 20, 14, 0, 0).unwrap(),
                        ends_at: Local.with_ymd_and_hms(2026, 6, 20, 15, 0, 0).unwrap(),
                        calendar_title: Some("Personal".to_string()),
                    },
                ],
                reminders: vec![SystemReminder {
                    id: "reminder-1".to_string(),
                    title: "Submit report".to_string(),
                    due_at: Some(Local.with_ymd_and_hms(2026, 6, 15, 17, 0, 0).unwrap()),
                    done: false,
                    list_title: Some("Tasks".to_string()),
                }],
            }),
            fail_with: None,
        });

        let range = service
            .load_range(
                Local.with_ymd_and_hms(2026, 6, 9, 0, 0, 0).unwrap(),
                Local.with_ymd_and_hms(2026, 6, 29, 23, 59, 59).unwrap(),
            )
            .unwrap();

        assert_eq!(range.events.len(), 2);
        assert_eq!(range.events[0].title, "Week 1 Event");
        assert_eq!(range.events[1].title, "Week 2 Event");
        assert_eq!(range.reminders.len(), 1);
        assert_eq!(range.reminders[0].title, "Submit report");
    }

    #[test]
    fn eventkit_service_load_range_propagates_errors() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: None,
            fail_with: Some("Network timeout".to_string()),
        });

        let error = service
            .load_range(
                Local.with_ymd_and_hms(2026, 6, 9, 0, 0, 0).unwrap(),
                Local.with_ymd_and_hms(2026, 6, 29, 23, 59, 59).unwrap(),
            )
            .unwrap_err();

        assert!(error.contains("Network timeout"));
    }

    #[tokio::test]
    async fn async_permission_request_returns_valid_status() {
        let result = super::request_calendar_access_async().await;
        assert!(result.is_ok());
        let status = result.unwrap();
        assert!(matches!(
            status,
            super::AccessStatus::Granted
                | super::AccessStatus::Denied
                | super::AccessStatus::Restricted
                | super::AccessStatus::NotDetermined
                | super::AccessStatus::Error
        ));
    }

    #[tokio::test]
    async fn async_reminders_permission_request_returns_valid_status() {
        let result = super::request_reminders_access_async().await;
        assert!(result.is_ok());
        let status = result.unwrap();
        assert!(matches!(
            status,
            super::AccessStatus::Granted
                | super::AccessStatus::Denied
                | super::AccessStatus::Restricted
                | super::AccessStatus::NotDetermined
                | super::AccessStatus::Error
        ));
    }
}

// Public API for requesting calendar access asynchronously
#[cfg(target_os = "macos")]
pub async fn request_calendar_access_async() -> Result<AccessStatus, String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Result<AccessStatus, String>>();
    let tx_boxed = Box::into_raw(Box::new(tx));

    unsafe extern "C" fn callback(context: *mut std::ffi::c_void, status_ptr: *const c_char) {
        let tx = Box::from_raw(
            context as *mut tokio::sync::oneshot::Sender<Result<AccessStatus, String>>,
        );
        let status_str = if status_ptr.is_null() {
            "error".to_string()
        } else {
            CStr::from_ptr(status_ptr).to_string_lossy().into_owned()
        };

        let status = match status_str.as_str() {
            "granted" => AccessStatus::Granted,
            "denied" => AccessStatus::Denied,
            "restricted" => AccessStatus::Restricted,
            "not_determined" => AccessStatus::NotDetermined,
            _ => AccessStatus::Error,
        };

        let _ = tx.send(Ok(status));
    }

    unsafe {
        gd_eventkit_request_calendar_access_async(tx_boxed as *mut std::ffi::c_void, callback);
    }

    rx.await
        .map_err(|e| format!("Permission channel closed: {}", e))?
}

#[cfg(not(target_os = "macos"))]
pub async fn request_calendar_access_async() -> Result<AccessStatus, String> {
    Ok(AccessStatus::Error)
}

// Public API for requesting reminders access asynchronously
#[cfg(target_os = "macos")]
pub async fn request_reminders_access_async() -> Result<AccessStatus, String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Result<AccessStatus, String>>();
    let tx_boxed = Box::into_raw(Box::new(tx));

    unsafe extern "C" fn callback(context: *mut std::ffi::c_void, status_ptr: *const c_char) {
        let tx = Box::from_raw(
            context as *mut tokio::sync::oneshot::Sender<Result<AccessStatus, String>>,
        );
        let status_str = if status_ptr.is_null() {
            "error".to_string()
        } else {
            CStr::from_ptr(status_ptr).to_string_lossy().into_owned()
        };

        let status = match status_str.as_str() {
            "granted" => AccessStatus::Granted,
            "denied" => AccessStatus::Denied,
            "restricted" => AccessStatus::Restricted,
            "not_determined" => AccessStatus::NotDetermined,
            _ => AccessStatus::Error,
        };

        let _ = tx.send(Ok(status));
    }

    unsafe {
        gd_eventkit_request_reminders_access_async(tx_boxed as *mut std::ffi::c_void, callback);
    }

    rx.await
        .map_err(|e| format!("Permission channel closed: {}", e))?
}

#[cfg(not(target_os = "macos"))]
pub async fn request_reminders_access_async() -> Result<AccessStatus, String> {
    Ok(AccessStatus::Error)
}
