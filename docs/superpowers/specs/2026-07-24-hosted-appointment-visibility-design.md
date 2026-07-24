# Created Appointment Visibility Design

## Goal

Show an employee's active, self-hosted lunch appointment in the home page's upcoming appointments so the host can open it and approve public applications.

## Scope

- Update the host branch of `getRelevantAppointments` in `src/lib/appointments/queries.ts`.
- Add a regression test for a self-hosted active appointment whose attendance state is not yet final.
- Do not change database schema, existing appointment data, public recruitment cards, or participant records.

## Design

The host query will retrieve appointments owned by the current employee with `status = 'active'` without applying a database-level `host_attendance_status IS NULL` filter. The mapping step will keep only appointments whose host attendance status is not a final value (`completed` or `cancelled`).

This retains the existing behavior of hiding appointments after the host confirms attendance, while allowing an active appointment to remain visible if its non-final attendance representation differs from the expected database null. The returned record remains `role: 'host'`, so the existing home card links to the appointment detail page where pending public applications can be accepted.

## Testing

Add a focused query test that mocks the Supabase responses, returns an active host appointment with a non-final attendance state, and asserts that `getRelevantAppointments` returns it as a host appointment. The test must fail under the current query filter and pass after the change.

## Risks and Exclusions

The change does not expose another employee's appointment and does not alter capacity or approval authorization. Final host attendance states remain excluded from the home list.
