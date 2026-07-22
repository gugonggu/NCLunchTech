# Review Profile Home Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve review display, home card coexistence, profile identity, visit cancellation, and menu capture for the lunch app.

**Architecture:** Keep changes in the existing Next.js App Router and Supabase service-role server-action patterns. Add only one schema migration for employee real names; reuse existing review photo, meal record, visit, and menu tables. UI changes stay in existing home, restaurant, leaderboard, and profile surfaces.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL/Storage, Vitest.

## Global Constraints

- Protect existing uncommitted changes and build on them.
- Do not expose real names in public review/comment/leaderboard surfaces.
- Use TDD for behavior changes.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before reporting completion.

---

### Task 1: Review Cards Show Matched Photos And Meal Info

**Files:**
- Modify: `src/lib/reviews/queries.ts`
- Modify: `src/app/restaurants/[id]/page.tsx`
- Test: `src/lib/reviews/queries.test.ts`

**Interfaces:**
- Produces: `getRecentReviews(restaurantId)` returns review rows with `photos` and `mealRecord`.
- Consumes: existing `review_photos`, `meal_records`, and `employees(nickname)` data.

- [ ] Write a failing test that maps a review's own photos and employee meal record onto the review row.
- [ ] Implement query mapping with per-review photo URLs and latest matching meal record.
- [ ] Render menu, price, rating chips, tags, and matched photos inside each review card.
- [ ] Run targeted tests.

### Task 2: Custom Meal Input Adds Menu Item

**Files:**
- Modify: `src/app/reviews/new/actions.ts`
- Test: `src/app/reviews/new/actions.test.ts`

**Interfaces:**
- Consumes: `upsertMealRecord(restaurantId, visitId, appointmentId, formData)`.
- Produces: when `customMenuName` is used, inserts or reuses a matching `menu_items` row for the restaurant.

- [ ] Write a failing server-action test for custom menu auto-add.
- [ ] Insert a `menu_items` row only when no same-name menu exists for the restaurant.
- [ ] Save the `meal_records.menu_item_id` to the inserted or existing menu item id.
- [ ] Run targeted tests.

### Task 3: Home Cards Coexist As Slides

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/lunch/HomeHero.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: current home data.
- Produces: multiple priority home cards in one horizontally scrollable area instead of one card replacing another.

- [ ] Write a failing test where an open poll and completed lunch both render in the home hero area.
- [ ] Refactor `HomeHero` to render all applicable cards in a horizontal snap carousel.
- [ ] Preserve existing buttons and review-hidden behavior.
- [ ] Run targeted tests.

### Task 4: Monthly Restaurant Card Compact Layout

**Files:**
- Modify: `src/components/lunch/RestaurantOfTheMonthCard.tsx`
- Test: `src/components/lunch/RestaurantOfTheMonthCard.test.tsx`

**Interfaces:**
- Consumes: `RestaurantOfTheMonth`.
- Produces: compact mode that does not squeeze badges/title/metrics on leaderboard.

- [ ] Write a failing compact layout test.
- [ ] Render compact card as one tidy link block with smaller label and wrapped metrics.
- [ ] Run targeted tests.

### Task 5: Nickname And Real Name Profile

**Files:**
- Create: `supabase/migrations/0036_employee_real_name.sql`
- Modify: `src/lib/auth/validation.ts`
- Modify: `src/app/api/auth/signup/route.ts`
- Modify: `src/lib/auth/session.ts`
- Modify: `src/app/me/page.tsx`
- Create/Modify: profile server action test files as needed.

**Interfaces:**
- Produces: `employees.real_name text`.
- Produces: profile update action validates nickname uniqueness and real-name length.
- Consumes: current employee session.

- [ ] Add failing validation tests for real name and profile updates.
- [ ] Add migration for `employees.real_name`.
- [ ] Require real name at signup and keep nickname for public display.
- [ ] Add `/me` form to change nickname and real name.
- [ ] Run targeted tests.

### Task 6: Invite Search Supports Real Name

**Files:**
- Modify: `src/lib/appointments/queries.ts`
- Modify: `src/app/appointments/new/actions.ts`
- Test: `src/lib/appointments/queries.test.ts`

**Interfaces:**
- Consumes: comma-separated invite tokens.
- Produces: lookup by nickname or real name while returning nickname for display.

- [ ] Write failing test resolving employees by nickname or real name.
- [ ] Query employees with both fields and dedupe by id.
- [ ] Preserve current notification behavior.
- [ ] Run targeted tests.

### Task 7: Completed Visit Cancellation

**Files:**
- Modify: `src/app/visits/actions.ts`
- Modify: `src/components/lunch/HomeHero.tsx`
- Modify: `src/components/lunch/TodayTimeline.tsx`
- Test: `src/lib/visits/validation.test.ts` or page/action tests.

**Interfaces:**
- Produces: action to cancel a completed personal visit from today's home follow-up state.
- Consumes: existing `visits.status = cancelled`.

- [ ] Write failing test that completed visit can be cancelled by owner.
- [ ] Allow server action to update completed visit to cancelled.
- [ ] Show a cancellation control beside completed visit summary.
- [ ] Run targeted tests.

### Task 8: Final Verification

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
