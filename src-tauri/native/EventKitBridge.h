#ifndef GOAL_DESK_EVENTKIT_BRIDGE_H
#define GOAL_DESK_EVENTKIT_BRIDGE_H

typedef struct GDEventKitResult {
    char *json;
    char *error;
} GDEventKitResult;

GDEventKitResult gd_eventkit_snapshot(const char *start_iso, const char *end_iso);
void gd_eventkit_request_calendar_access_async(void *context, void (*callback)(void *, const char *));
void gd_eventkit_request_reminders_access_async(void *context, void (*callback)(void *, const char *));
void gd_eventkit_free_string(char *string);

#endif
