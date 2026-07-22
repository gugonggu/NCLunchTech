# Immediate Lunch Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users choose dine-in or delivery for group lunches and immediately record attendance or write a review after choosing a restaurant.

**Architecture:** Add a constrained `meal_type` column to appointments, validate it at appointment creation, and expose it in appointment detail. Remove the one-hour confirmation gate while retaining ownership and participation checks. Review eligibility gains an explicit, validated visit or appointment source so an arbitrary restaurant cannot be reviewed.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Supabase Postgres, Vitest.

## Global Constraints

- Server-side authorization and input validation remain mandatory.
- No secrets are written to code or migrations.
- Full lint, typecheck, test, and production build must run before completion.

### Task 1: Appointment meal type

**Files:** migration `supabase/migrations/0035_appointment_meal_type.sql`; validation and creation form/actions in `src/lib/appointments` and `src/app/appointments/new`.

- [ ] Write a failing validation test for only `dine_in` and `delivery`.
- [ ] Add the DB constraint, server parser, form radio buttons, and insert value.
- [ ] Run the validation and appointment form tests.

### Task 2: Immediate attendance and source-bound reviews

**Files:** visit and appointment actions/pages, review queries/page/actions, confirmation tests.

- [ ] Update confirmation timing tests to specify immediate eligibility.
- [ ] Remove the timing guard while retaining current ownership/status validation.
- [ ] Permit a review only when its submitted visit or appointment source belongs to the employee and matches the selected restaurant.
- [ ] Run targeted tests.

### Task 3: Verification

- [ ] Run lint, typecheck, complete test suite, and production build.
- [ ] Commit the implementation.
