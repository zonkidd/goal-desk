import EventKit
import Foundation

struct IntegrationStatus: Codable {
    let calendar: String
    let reminders: String
}

struct CalendarEventPayload: Codable {
    let id: String
    let title: String
    let starts_at: String
    let ends_at: String
    let calendar_title: String?
}

struct ReminderPayload: Codable {
    let id: String
    let title: String
    let due_at: String?
    let done: Bool
    let list_title: String?
}

struct SnapshotPayload: Codable {
    let integration_status: IntegrationStatus
    let calendar_events: [CalendarEventPayload]
    let reminders: [ReminderPayload]
}

enum BridgeError: Error, CustomStringConvertible {
    case invalidArguments(String)
    case invalidDate(String)
    case accessDenied(String)
    case lookupFailed(String)
    case saveFailed(String)

    var description: String {
        switch self {
        case .invalidArguments(let message),
             .invalidDate(let message),
             .accessDenied(let message),
             .lookupFailed(let message),
             .saveFailed(let message):
            return message
        }
    }
}

let formatter = ISO8601DateFormatter()
formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

func parseDate(_ value: String) -> Date? {
    if let parsed = formatter.date(from: value) {
        return parsed
    }

    let fallback = ISO8601DateFormatter()
    fallback.formatOptions = [.withInternetDateTime]
    return fallback.date(from: value)
}

func isoString(_ date: Date) -> String {
    formatter.string(from: date)
}

func printJSON<T: Encodable>(_ payload: T) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try encoder.encode(payload)
    if let text = String(data: data, encoding: .utf8) {
        FileHandle.standardOutput.write(Data(text.utf8))
    }
}

func bridgeStatus(for status: EKAuthorizationStatus) -> String {
    switch status {
    case .fullAccess, .authorized:
        return "granted"
    case .writeOnly:
        return "restricted"
    case .denied:
        return "denied"
    case .restricted:
        return "restricted"
    case .notDetermined:
        return "not_determined"
    @unknown default:
        return "error"
    }
}

func requestEventAccess(store: EKEventStore) -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var granted = false

    if #available(macOS 14.0, *) {
        store.requestFullAccessToEvents { result, _ in
            granted = result
            semaphore.signal()
        }
    } else {
        store.requestAccess(to: .event) { result, _ in
            granted = result
            semaphore.signal()
        }
    }

    semaphore.wait()
    return granted
}

func requestReminderAccess(store: EKEventStore) -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var granted = false

    if #available(macOS 14.0, *) {
        store.requestFullAccessToReminders { result, _ in
            granted = result
            semaphore.signal()
        }
    } else {
        store.requestAccess(to: .reminder) { result, _ in
            granted = result
            semaphore.signal()
        }
    }

    semaphore.wait()
    return granted
}

func resolvedCalendarStatus(store: EKEventStore) -> String {
    let current = EKEventStore.authorizationStatus(for: .event)
    if current == .notDetermined {
        _ = requestEventAccess(store: store)
    }
    return bridgeStatus(for: EKEventStore.authorizationStatus(for: .event))
}

func resolvedReminderStatus(store: EKEventStore) -> String {
    let current = EKEventStore.authorizationStatus(for: .reminder)
    if current == .notDetermined {
        _ = requestReminderAccess(store: store)
    }
    return bridgeStatus(for: EKEventStore.authorizationStatus(for: .reminder))
}

func reminderDate(_ reminder: EKReminder) -> Date? {
    guard let components = reminder.dueDateComponents else {
        return nil
    }
    return Calendar.current.date(from: components)
}

func fetchReminders(store: EKEventStore, start: Date, end: Date) -> [ReminderPayload] {
    let semaphore = DispatchSemaphore(value: 0)
    let predicate = store.predicateForReminders(in: nil)
    var reminders: [ReminderPayload] = []

    store.fetchReminders(matching: predicate) { items in
        defer { semaphore.signal() }
        let values = items ?? []
        reminders = values.compactMap { item in
            guard let reminder = item as? EKReminder else {
                return nil
            }

            let dueAt = reminderDate(reminder)
            let shouldInclude: Bool
            if let dueAt {
                shouldInclude = dueAt >= start && dueAt <= end
            } else {
                shouldInclude = !reminder.isCompleted
            }

            guard shouldInclude else {
                return nil
            }

            return ReminderPayload(
                id: reminder.calendarItemIdentifier,
                title: reminder.title,
                due_at: dueAt.map(isoString),
                done: reminder.isCompleted,
                list_title: reminder.calendar.title
            )
        }
    }

    semaphore.wait()
    return reminders.sorted {
        switch ($0.due_at, $1.due_at) {
        case let (lhs?, rhs?):
            return lhs < rhs
        case (.some, .none):
            return true
        case (.none, .some):
            return false
        case (.none, .none):
            return $0.title < $1.title
        }
    }
}

func snapshot(start: Date, end: Date) throws {
    let store = EKEventStore()
    let calendarStatus = resolvedCalendarStatus(store: store)
    let reminderStatus = resolvedReminderStatus(store: store)

    let events: [CalendarEventPayload]
    if calendarStatus == "granted" {
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
        events = store.events(matching: predicate)
            .sorted { $0.startDate < $1.startDate }
            .map {
                CalendarEventPayload(
                    id: $0.calendarItemIdentifier,
                    title: $0.title,
                    starts_at: isoString($0.startDate),
                    ends_at: isoString($0.endDate),
                    calendar_title: $0.calendar.title
                )
            }
    } else {
        events = []
    }

    let reminders = reminderStatus == "granted"
        ? fetchReminders(store: store, start: start, end: end)
        : []

    try printJSON(
        SnapshotPayload(
            integration_status: IntegrationStatus(calendar: calendarStatus, reminders: reminderStatus),
            calendar_events: events,
            reminders: reminders
        )
    )
}

func setReminderCompleted(identifier: String, done: Bool) throws {
    let store = EKEventStore()
    let reminderStatus = resolvedReminderStatus(store: store)

    guard reminderStatus == "granted" else {
        throw BridgeError.accessDenied("Reminder access is not granted")
    }

    guard let reminder = store.calendarItem(withIdentifier: identifier) as? EKReminder else {
        throw BridgeError.lookupFailed("Reminder not found: \(identifier)")
    }

    reminder.isCompleted = done
    reminder.completionDate = done ? Date() : nil

    do {
        try store.save(reminder, commit: true)
    } catch {
        throw BridgeError.saveFailed("Unable to save reminder: \(error.localizedDescription)")
    }

    try printJSON(
        ReminderPayload(
            id: reminder.calendarItemIdentifier,
            title: reminder.title,
            due_at: reminderDate(reminder).map(isoString),
            done: reminder.isCompleted,
            list_title: reminder.calendar.title
        )
    )
}

func dateComponents(_ date: Date) -> DateComponents {
    let calendar = Calendar.current
    let components = calendar.dateComponents(in: calendar.timeZone, from: date)
    return DateComponents(
        calendar: calendar,
        timeZone: calendar.timeZone,
        year: components.year,
        month: components.month,
        day: components.day,
        hour: components.hour,
        minute: components.minute
    )
}

func createReminder(title: String, dueAtISO: String?) throws {
    let store = EKEventStore()
    let reminderStatus = resolvedReminderStatus(store: store)

    guard reminderStatus == "granted" else {
        throw BridgeError.accessDenied("Reminder access is not granted")
    }

    guard let calendar = store.defaultCalendarForNewReminders() else {
        throw BridgeError.lookupFailed("No default reminders list is available")
    }

    let reminder = EKReminder.reminder(with: store)
    reminder.calendar = calendar
    reminder.title = title

    if let dueAtISO, !dueAtISO.isEmpty {
        guard let dueAt = parseDate(dueAtISO) else {
            throw BridgeError.invalidDate("Invalid reminder due date: \(dueAtISO)")
        }
        reminder.dueDateComponents = dateComponents(dueAt)
    }

    do {
        try store.save(reminder, commit: true)
    } catch {
        throw BridgeError.saveFailed("Unable to create reminder: \(error.localizedDescription)")
    }

    try printJSON(
        ReminderPayload(
            id: reminder.calendarItemIdentifier,
            title: reminder.title,
            due_at: reminderDate(reminder).map(isoString),
            done: reminder.isCompleted,
            list_title: reminder.calendar.title
        )
    )
}

func main() throws {
    let arguments = CommandLine.arguments.dropFirst()
    guard let command = arguments.first else {
        throw BridgeError.invalidArguments("Missing EventKit bridge command")
    }

    switch command {
    case "snapshot":
        guard arguments.count == 3 else {
            throw BridgeError.invalidArguments("snapshot expects <startISO> <endISO>")
        }
        let startISO = arguments[arguments.index(after: arguments.startIndex)]
        let endISO = arguments[arguments.index(arguments.startIndex, offsetBy: 2)]
        guard let start = parseDate(startISO) else {
            throw BridgeError.invalidDate("Invalid start date: \(startISO)")
        }
        guard let end = parseDate(endISO) else {
            throw BridgeError.invalidDate("Invalid end date: \(endISO)")
        }
        try snapshot(start: start, end: end)
    case "set-reminder-completed":
        guard arguments.count == 3 else {
            throw BridgeError.invalidArguments("set-reminder-completed expects <identifier> <true|false>")
        }
        let identifier = arguments[arguments.index(after: arguments.startIndex)]
        let doneValue = arguments[arguments.index(arguments.startIndex, offsetBy: 2)]
        guard let done = Bool(doneValue) else {
            throw BridgeError.invalidArguments("Invalid reminder completion flag: \(doneValue)")
        }
        try setReminderCompleted(identifier: identifier, done: done)
    case "create-reminder":
        guard arguments.count == 2 || arguments.count == 3 else {
            throw BridgeError.invalidArguments("create-reminder expects <title> [dueAtISO]")
        }
        let title = arguments[arguments.index(after: arguments.startIndex)]
        let dueAtISO = arguments.count == 3 ? arguments[arguments.index(arguments.startIndex, offsetBy: 2)] : nil
        try createReminder(title: title, dueAtISO: dueAtISO)
    default:
        throw BridgeError.invalidArguments("Unsupported EventKit bridge command: \(command)")
    }
}

do {
    try main()
} catch {
    FileHandle.standardError.write(Data("\(error)\n".utf8))
    exit(1)
}
