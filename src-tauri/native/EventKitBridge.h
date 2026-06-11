#ifndef GOAL_DESK_EVENTKIT_BRIDGE_H
#define GOAL_DESK_EVENTKIT_BRIDGE_H

typedef struct GDEventKitResult {
    char *json;
    char *error;
} GDEventKitResult;

GDEventKitResult gd_eventkit_snapshot(const char *start_iso, const char *end_iso);
GDEventKitResult gd_eventkit_create_reminder(const char *title, const char *due_at_iso);
GDEventKitResult gd_eventkit_set_reminder_completed(const char *identifier, int done);
void gd_eventkit_free_string(char *string);

#endif
