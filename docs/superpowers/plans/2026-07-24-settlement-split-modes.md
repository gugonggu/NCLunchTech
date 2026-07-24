# Settlement Split Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support exact custom settlement amounts and equal settlement rounding assigned to a selected attendee.

**Architecture:** Persist split mode and optional rounding recipient on `settlements`, while retaining `settlement_shares` as the calculated snapshot. Server validation selects one of two share calculators: equal split assigns the exact residual to the chosen attendee; custom split accepts only a complete, exact-total attendee map.

**Tech Stack:** Next.js Server Actions, TypeScript, Zod, Supabase PostgreSQL, Vitest.

## Global Constraints

- Only actual attendees may create/update settlements and be payer or rounding recipient.
- Share amounts are non-negative whole won and always sum exactly to total amount.
- No payment, transfer, or bank-account functionality.

---

### Task 1: Persist settlement split metadata

**Files:**
- Create: `supabase/migrations/0035_settlement_split_modes.sql`
- Test: `src/lib/settlements/migration-0035.test.ts`

- [ ] Write a failing migration-content test that asserts `split_mode` defaults to `equal`, `rounding_employee_id` references employees, and the rounding unit check permits 1, 100, and 1,000.
- [ ] Run `npm.cmd test -- src/lib/settlements/migration-0035.test.ts` and observe failure.
- [ ] Add the minimal SQL migration, then re-run the test successfully.

### Task 2: Validate and calculate each split mode

**Files:**
- Modify: `src/lib/settlements/validation.ts`
- Modify: `src/lib/settlements/validation.test.ts`

- [ ] Write failing tests for a 1,000-won equal split with a selected residual recipient and valid/invalid custom share totals.
- [ ] Run `npm.cmd test -- src/lib/settlements/validation.test.ts` and observe failure.
- [ ] Add split mode schemas, a 1,000-won rounding unit, equal residual calculation, and strict custom-share parsing; re-run successfully.

### Task 3: Save, retrieve, and edit the new settlement fields

**Files:**
- Modify: `src/lib/settlements/queries.ts`
- Modify: `src/app/appointments/[id]/actions.ts`
- Modify: `src/app/appointments/[id]/page.tsx`

- [ ] Add tests for action-level invalid custom input and metadata passing where feasible.
- [ ] Extend query types/upsert data, server-action authorization and parsing, and the form's equal/custom controls with per-attendee inputs.
- [ ] Verify focused tests pass.

### Task 4: Full verification

- [ ] Run `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build`.
