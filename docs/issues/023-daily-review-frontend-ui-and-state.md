# Daily Review Frontend UI and State

## Metadata
- **Parent PRD**: `docs/prd/daily-review.md`
- **Spec**: `docs/spec/daily-review.md`
- **Label**: ready-for-agent

## Overview
Implement the frontend user interface and state management for the Daily Review feature. This slice sets up the UI shell, the timeline rendering, and the chat-like input box.

## Tasks
- [ ] Create `dailyReviewStore.ts` using Zustand to manage `items`, `isLoading`, and `hasMore`.
- [ ] Update the left Sidebar to include a navigation entry for "Daily Review".
- [ ] Build `DailyReviewView` as the main page container for the route.
- [ ] Build `DailyReviewInput` component (fixed at the bottom) with basic Enter-to-send functionality.
- [ ] Build `DailyReviewTimeline` component that groups loaded items by date.
- [ ] Build `DailyReviewItemCard` to display a single review item.
- [ ] Wire up the UI to the backend `create` and `get_timeline` commands to ensure items can be saved and displayed.
