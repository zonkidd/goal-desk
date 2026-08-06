# Daily Review Interactions and Date Logic

## Metadata
- **Parent PRD**: `docs/prd/daily-review.md`
- **Spec**: `docs/spec/daily-review.md`
- **Label**: ready-for-agent

## Overview
Polish the Daily Review feature by adding edit/delete interactions to the item cards, implementing the intelligent date logic for the input prompt, and ensuring infinite scroll works smoothly.

## Tasks
- [ ] Implement hover state on `DailyReviewItemCard` to show Edit and Delete buttons.
- [ ] Wire up the Delete button to the `delete_daily_review_item` command via the store.
- [ ] Implement inline editing: clicking Edit swaps the text for a textarea, hitting Enter saves it via `update_daily_review_item`.
- [ ] Implement intelligent input prompt logic in `DailyReviewInput`:
  - Check if any items exist for "Yesterday" in the store.
  - If no items exist for yesterday, set placeholder to "花个几分钟回顾一下昨天吧" and target date to yesterday.
  - If items exist for yesterday, set placeholder to "花个几分钟回顾一下今天吧" and target date to today.
- [ ] Implement smooth infinite scrolling (loading older dates when scrolling up the timeline).
