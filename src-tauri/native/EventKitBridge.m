#import "EventKitBridge.h"

#import <EventKit/EventKit.h>
#import <Foundation/Foundation.h>
#include <stdlib.h>
#include <string.h>

static NSString *GDResultStatus(EKAuthorizationStatus status) {
    switch (status) {
        case EKAuthorizationStatusFullAccess:
            return @"granted";
        case EKAuthorizationStatusWriteOnly:
        case EKAuthorizationStatusRestricted:
            return @"restricted";
        case EKAuthorizationStatusDenied:
            return @"denied";
        case EKAuthorizationStatusNotDetermined:
            return @"not_determined";
        default:
            return @"error";
    }
}

static NSError *GDMakeError(NSString *description) {
    return [NSError errorWithDomain:@"com.goaldesk.eventkit"
                               code:1
                           userInfo:@{NSLocalizedDescriptionKey: description ?: @"Unknown EventKit error"}];
}

static NSISO8601DateFormatter *GDISOFormatter(void) {
    static NSISO8601DateFormatter *formatter;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        formatter = [[NSISO8601DateFormatter alloc] init];
        formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithFractionalSeconds;
    });
    return formatter;
}

static NSDate *GDParseDate(NSString *value) {
    if (value == nil || value.length == 0) {
        return nil;
    }

    NSDate *date = [GDISOFormatter() dateFromString:value];
    if (date != nil) {
        return date;
    }

    NSISO8601DateFormatter *fallback = [[NSISO8601DateFormatter alloc] init];
    fallback.formatOptions = NSISO8601DateFormatWithInternetDateTime;
    return [fallback dateFromString:value];
}

static NSString *GDFormatDate(NSDate *date) {
    return date ? [GDISOFormatter() stringFromDate:date] : nil;
}

static BOOL GDRequestCalendarAccess(EKEventStore *store) {
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    __block BOOL granted = NO;

    if (@available(macOS 14.0, *)) {
        [store requestFullAccessToEventsWithCompletion:^(BOOL result, NSError * _Nullable error) {
            granted = result;
            dispatch_semaphore_signal(semaphore);
        }];
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        [store requestAccessToEntityType:EKEntityTypeEvent completion:^(BOOL result, NSError * _Nullable error) {
            granted = result;
            dispatch_semaphore_signal(semaphore);
        }];
#pragma clang diagnostic pop
    }

    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
    return granted;
}

static BOOL GDRequestReminderAccess(EKEventStore *store) {
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    __block BOOL granted = NO;

    if (@available(macOS 14.0, *)) {
        [store requestFullAccessToRemindersWithCompletion:^(BOOL result, NSError * _Nullable error) {
            granted = result;
            dispatch_semaphore_signal(semaphore);
        }];
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        [store requestAccessToEntityType:EKEntityTypeReminder completion:^(BOOL result, NSError * _Nullable error) {
            granted = result;
            dispatch_semaphore_signal(semaphore);
        }];
#pragma clang diagnostic pop
    }

    dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
    return granted;
}

static NSString *GDResolvedCalendarStatus(EKEventStore *store) {
    EKAuthorizationStatus status = [EKEventStore authorizationStatusForEntityType:EKEntityTypeEvent];
    if (status == EKAuthorizationStatusNotDetermined) {
        GDRequestCalendarAccess(store);
        status = [EKEventStore authorizationStatusForEntityType:EKEntityTypeEvent];
    }
    return GDResultStatus(status);
}

static NSString *GDResolvedReminderStatus(EKEventStore *store) {
    EKAuthorizationStatus status = [EKEventStore authorizationStatusForEntityType:EKEntityTypeReminder];
    if (status == EKAuthorizationStatusNotDetermined) {
        GDRequestReminderAccess(store);
        status = [EKEventStore authorizationStatusForEntityType:EKEntityTypeReminder];
    }
    return GDResultStatus(status);
}

static NSDate *GDReminderDate(EKReminder *reminder) {
    if (reminder.dueDateComponents == nil) {
        return nil;
    }
    return [[NSCalendar currentCalendar] dateFromComponents:reminder.dueDateComponents];
}

static NSDictionary *GDReminderPayload(EKReminder *reminder) {
    NSDate *dueDate = GDReminderDate(reminder);
    return @{
        @"id": reminder.calendarItemIdentifier ?: @"",
        @"title": reminder.title ?: @"",
        @"due_at": dueDate ? GDFormatDate(dueDate) : [NSNull null],
        @"done": @(reminder.isCompleted),
        @"list_title": reminder.calendar.title ?: [NSNull null],
    };
}

static NSDateComponents *GDDateComponents(NSDate *date) {
    NSCalendar *calendar = [NSCalendar currentCalendar];
    NSDateComponents *components = [calendar componentsInTimeZone:calendar.timeZone fromDate:date];
    NSDateComponents *result = [[NSDateComponents alloc] init];
    result.calendar = calendar;
    result.timeZone = calendar.timeZone;
    result.year = components.year;
    result.month = components.month;
    result.day = components.day;
    result.hour = components.hour;
    result.minute = components.minute;
    return result;
}

static char *GDDupNSString(NSString *value) {
    if (value == nil) {
        return NULL;
    }

    const char *utf8 = [value UTF8String];
    if (utf8 == NULL) {
        return NULL;
    }
    return strdup(utf8);
}

static GDEventKitResult GDJSONResult(id payload, NSError *error) {
    if (error != nil) {
        return (GDEventKitResult){.json = NULL, .error = GDDupNSString(error.localizedDescription)};
    }

    NSError *jsonError = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:payload options:0 error:&jsonError];
    if (jsonData == nil) {
        NSString *message = jsonError.localizedDescription ?: @"Unable to serialize EventKit response";
        return (GDEventKitResult){.json = NULL, .error = GDDupNSString(message)};
    }

    NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return (GDEventKitResult){.json = GDDupNSString(jsonString), .error = NULL};
}

GDEventKitResult gd_eventkit_snapshot(const char *start_iso, const char *end_iso) {
    @autoreleasepool {
        NSString *startISO = start_iso ? [NSString stringWithUTF8String:start_iso] : nil;
        NSString *endISO = end_iso ? [NSString stringWithUTF8String:end_iso] : nil;
        NSDate *startDate = GDParseDate(startISO);
        NSDate *endDate = GDParseDate(endISO);
        if (startDate == nil || endDate == nil) {
            return GDJSONResult(nil, GDMakeError(@"Invalid snapshot date range"));
        }

        EKEventStore *store = [[EKEventStore alloc] init];
        NSString *calendarStatus = GDResolvedCalendarStatus(store);
        NSString *reminderStatus = GDResolvedReminderStatus(store);

        NSMutableArray *calendarEvents = [NSMutableArray array];
        if ([calendarStatus isEqualToString:@"granted"]) {
            NSPredicate *predicate = [store predicateForEventsWithStartDate:startDate endDate:endDate calendars:nil];
            NSArray<EKEvent *> *events = [[store eventsMatchingPredicate:predicate] sortedArrayUsingComparator:^NSComparisonResult(EKEvent *lhs, EKEvent *rhs) {
                return [lhs.startDate compare:rhs.startDate];
            }];

            for (EKEvent *event in events) {
                [calendarEvents addObject:@{
                    @"id": event.calendarItemIdentifier ?: @"",
                    @"title": event.title ?: @"",
                    @"starts_at": GDFormatDate(event.startDate) ?: @"",
                    @"ends_at": GDFormatDate(event.endDate) ?: @"",
                    @"calendar_title": event.calendar.title ?: [NSNull null],
                }];
            }
        }

        NSMutableArray *reminders = [NSMutableArray array];
        if ([reminderStatus isEqualToString:@"granted"]) {
            dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
            NSPredicate *predicate = [store predicateForRemindersInCalendars:nil];
            [store fetchRemindersMatchingPredicate:predicate completion:^(NSArray<EKReminder *> * _Nullable items) {
                NSArray<EKReminder *> *values = items ?: @[];
                for (EKReminder *reminder in values) {
                    NSDate *dueDate = GDReminderDate(reminder);
                    BOOL includeReminder = dueDate ? ([dueDate compare:startDate] != NSOrderedAscending && [dueDate compare:endDate] != NSOrderedDescending) : !reminder.isCompleted;
                    if (!includeReminder) {
                        continue;
                    }
                    [reminders addObject:GDReminderPayload(reminder)];
                }

                [reminders sortUsingComparator:^NSComparisonResult(NSDictionary *lhs, NSDictionary *rhs) {
                    id lhsDue = lhs[@"due_at"];
                    id rhsDue = rhs[@"due_at"];
                    if ([lhsDue isKindOfClass:[NSString class]] && [rhsDue isKindOfClass:[NSString class]]) {
                        return [lhsDue compare:rhsDue];
                    }
                    if ([lhsDue isKindOfClass:[NSString class]]) {
                        return NSOrderedAscending;
                    }
                    if ([rhsDue isKindOfClass:[NSString class]]) {
                        return NSOrderedDescending;
                    }
                    return [lhs[@"title"] compare:rhs[@"title"]];
                }];
                dispatch_semaphore_signal(semaphore);
            }];
            dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
        }

        NSDictionary *payload = @{
            @"integration_status": @{
                @"calendar": calendarStatus ?: @"error",
                @"reminders": reminderStatus ?: @"error",
            },
            @"calendar_events": calendarEvents,
            @"reminders": reminders,
        };

        return GDJSONResult(payload, nil);
    }
}

GDEventKitResult gd_eventkit_create_reminder(const char *title, const char *due_at_iso) {
    @autoreleasepool {
        NSString *reminderTitle = title ? [NSString stringWithUTF8String:title] : nil;
        if (reminderTitle == nil || reminderTitle.length == 0) {
            return GDJSONResult(nil, GDMakeError(@"Reminder title cannot be empty"));
        }

        EKEventStore *store = [[EKEventStore alloc] init];
        NSString *reminderStatus = GDResolvedReminderStatus(store);
        if (![reminderStatus isEqualToString:@"granted"]) {
            return GDJSONResult(nil, GDMakeError(@"Reminder access is not granted"));
        }

        EKCalendar *calendar = [store defaultCalendarForNewReminders];
        if (calendar == nil) {
            return GDJSONResult(nil, GDMakeError(@"No default reminders list is available"));
        }

        EKReminder *reminder = [EKReminder reminderWithEventStore:store];
        reminder.calendar = calendar;
        reminder.title = reminderTitle;

        if (due_at_iso != NULL) {
            NSString *dueAtISO = [NSString stringWithUTF8String:due_at_iso];
            NSDate *dueDate = GDParseDate(dueAtISO);
            if (dueDate == nil) {
                return GDJSONResult(nil, GDMakeError(@"Invalid reminder due date"));
            }
            reminder.dueDateComponents = GDDateComponents(dueDate);
        }

        NSError *saveError = nil;
        BOOL saved = [store saveReminder:reminder commit:YES error:&saveError];
        if (!saved) {
            NSString *message = saveError.localizedDescription ?: @"Unable to create reminder";
            return GDJSONResult(nil, GDMakeError(message));
        }

        return GDJSONResult(GDReminderPayload(reminder), nil);
    }
}

GDEventKitResult gd_eventkit_set_reminder_completed(const char *identifier, int done) {
    @autoreleasepool {
        NSString *reminderIdentifier = identifier ? [NSString stringWithUTF8String:identifier] : nil;
        if (reminderIdentifier == nil || reminderIdentifier.length == 0) {
            return GDJSONResult(nil, GDMakeError(@"Reminder identifier cannot be empty"));
        }

        EKEventStore *store = [[EKEventStore alloc] init];
        NSString *reminderStatus = GDResolvedReminderStatus(store);
        if (![reminderStatus isEqualToString:@"granted"]) {
            return GDJSONResult(nil, GDMakeError(@"Reminder access is not granted"));
        }

        EKReminder *reminder = (EKReminder *)[store calendarItemWithIdentifier:reminderIdentifier];
        if (![reminder isKindOfClass:[EKReminder class]]) {
            return GDJSONResult(nil, GDMakeError([NSString stringWithFormat:@"Reminder not found: %@", reminderIdentifier]));
        }

        reminder.completed = (done != 0);
        reminder.completionDate = done ? [NSDate date] : nil;

        NSError *saveError = nil;
        BOOL saved = [store saveReminder:reminder commit:YES error:&saveError];
        if (!saved) {
            NSString *message = saveError.localizedDescription ?: @"Unable to save reminder";
            return GDJSONResult(nil, GDMakeError(message));
        }

        return GDJSONResult(GDReminderPayload(reminder), nil);
    }
}

void gd_eventkit_free_string(char *string) {
    if (string != NULL) {
        free(string);
    }
}
