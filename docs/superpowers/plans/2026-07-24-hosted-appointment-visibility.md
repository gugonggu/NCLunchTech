# Hosted Appointment Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep an active appointment visible to its creator on the home page so the creator can open it and process public participation applications.

**Architecture:** Query the current employee's active hosted appointments without a database null filter on host attendance. Filter only final host attendance states while mapping query results into `RelevantAppointment` records. A mocked-query regression test models the former database filter and proves the active appointment remains available.

**Tech Stack:** Next.js, TypeScript, Vitest, Supabase server client.

## Global Constraints

- Change only hosted appointment visibility; do not modify schema, existing data, capacity, or authorization.
- Final host attendance states (`completed`, `cancelled`) must remain absent from the home list.
- Follow test-driven development and run lint, typecheck, test, and build before completion.

---

### Task 1: Preserve active hosted appointments in the home query

**Files:**
- Create: `src/lib/appointments/queries.test.ts`
- Modify: `src/lib/appointments/queries.ts`

**Interfaces:**
- Consumes: `getRelevantAppointments(employeeId: string, now: Date)`.
- Produces: a `RelevantAppointment` with `role: "host"` for an active appointment with a non-final host attendance status.

- [ ] **Step 1: Write the failing test**

Mock the service-role client so applying `is("host_attendance_status", null)` removes the hosted appointment. Assert `getRelevantAppointments("employee-1", now)` returns the active appointment as `{ role: "host", participantStatus: null, needsConfirmation: true }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/appointments/queries.test.ts`

Expected: the result is empty because the current hosted-appointment query applies the null attendance filter.

- [ ] **Step 3: Write minimal implementation**

Remove `.is("host_attendance_status", null)` from the hosted query. Select `host_attendance_status`, and skip only rows whose value is `"completed"` or `"cancelled"` while mapping hosted rows.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/appointments/queries.test.ts`

Expected: PASS with one host appointment returned.

- [ ] **Step 5: Run project verification**

Run: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

