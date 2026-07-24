# Settlement Split Modes Design

## Goal

Allow completed appointment attendees to create a settlement either by equal split with a designated rounding recipient or by exact participant-specific amounts.

## Scope

- Add equal and custom settlement modes to the appointment settlement form.
- Support rounding units of 1, 100, and 1,000 won for equal splits.
- Let the editor choose an attendee who receives the rounding difference.
- Validate and store exact custom amounts for every attendee.
- Add a migration, server-side validation, and regression tests.

## Data Model

Add `split_mode` (`equal` or `custom`) and `rounding_employee_id` (nullable employee reference) to `settlements`. Existing rows default to `equal`; their rounding recipient defaults to `payer_employee_id`, preserving current behavior.

`settlement_shares` remains the immutable per-person amount snapshot. The new metadata allows the edit form to restore the selected mode and rounding recipient without guessing from share values.

## Equal Split

The server calculates the rounded equal amount for every attendee except the selected rounding recipient. The recipient receives `totalAmount - sum(other shares)`, so all shares always sum exactly to the total. The rounding recipient must be an actual attendee.

## Custom Split

The form presents one non-negative integer amount field for each actual attendee. The server rejects any missing attendee, unknown attendee, negative/non-integer amount, or a sum that differs from `totalAmount`. Custom mode does not use a rounding recipient.

## Authorization and Exclusions

Existing authorization remains unchanged: only actual attendees can create or update a settlement, and the payer must be an actual attendee. No account, transfer, or payment-request integration is added.

## Testing

Cover equal shares with a selected 1,000-won rounding recipient, custom share validation including exact totals and invalid inputs, and migration defaults for existing settlements.
