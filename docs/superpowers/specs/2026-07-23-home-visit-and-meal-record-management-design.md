# Home Visit and Meal Record Management Design

## Goal

Fix the home-page visit-cancellation failure, add visual breathing room below the home content, and let employees manage their meal records from My Info.

## Scope

- Fix cancellation of a completed same-day visit from the home page.
- Add bottom spacing to the authenticated home content.
- Show an employee's meal records in My Info, newest first.
- Allow an employee to edit or delete only their own meal records.

## Exclusions

- Do not delete or alter visits, appointments, reviews, menu items, or restaurant data when a meal record is deleted.
- Do not add administrator meal-record management, bulk actions, pagination, or search.
- Do not change the existing review-writing flow except where shared meal-record code is required.

## Data and Behavior

### Visit cancellation

`visits` requires `completed_at` to be present exactly when its status is `completed`. Cancelling a completed visit must therefore set its status to `cancelled`, set `cancelled_at`, and clear `completed_at` in the same update. Existing meal records and reviews linked to that visit remain stored; they are historical user-entered data and are not cascade-deleted by a status change.

### Home spacing

The home page's final timeline section receives a bottom padding that is visible above the mobile bottom navigation while retaining the existing AppShell safe-area handling. No global layout spacing changes are needed.

### Meal record management

My Info displays a compact "Meal records" section containing all records owned by the current employee, ordered by `created_at` descending. Each row contains the restaurant name, saved menu name, paid price, and record date. Records may originate from a personal visit or appointment; the source type is not editable.

Selecting Edit opens a dedicated employee-owned record editor. The editor permits selecting a current restaurant menu item or entering a custom menu name, and changing the paid price. It validates the same menu-name and price rules used by the existing meal-record form. It does not require the linked visit or appointment to still be completed, so a record preserved after a visit cancellation remains manageable.

Selecting Delete removes only the selected `meal_records` row after server-side ownership validation, then returns to My Info with a status message.

## Security and Validation

- Every edit, delete, list, and detail query filters by the authenticated employee ID.
- The server derives the restaurant ID from the owned record; the client cannot choose another restaurant while editing.
- A selected menu item must belong to the record's restaurant.
- Custom menu names and paid prices use the existing Zod validation rules.
- Unknown status-query values are not rendered.

## Error Handling

- Missing or non-owned record IDs redirect to My Info with a generic not-found status.
- Invalid edit input returns to the editor with an error status and does not write data.
- Database write failures continue to surface as server errors rather than pretending a save succeeded.

## Testing

- Add a regression test for completed-to-cancelled state data, including cleared `completed_at` in the action's update payload or extracted transition helper.
- Add query and validation tests for owned meal record management and invalid/non-owned access.
- Add component/page tests for the My Info record list and status feedback.
- Run lint, typecheck, unit tests, and production build.
