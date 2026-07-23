# Home Visit and Meal Record Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix completed-visit cancellation, add home-page bottom breathing room, and provide employee-owned meal-record editing and deletion from My Info.

**Architecture:** Extract the cancellation update payload to a tested visit helper. Add server-only queries and actions that scope meal records to the current employee, then render a My Info list and a dedicated record editor.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Tailwind CSS, Supabase, Zod, Vitest, Testing Library.

## Global Constraints

- Use Node.js 22.23.1 when available; Node.js must be at least 20.19.0.
- Validate all external input on the server; do not expose service-role credentials.
- Scope every meal-record read and write to the authenticated employee.
- Deleting a meal record must not alter visits, appointments, reviews, menu items, or restaurants.
- Keep meal records and reviews when a completed visit is cancelled.
- Do not add administration, bulk actions, pagination, or search.
- Before completion run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

---

## File Structure

- `src/lib/visits/validation.ts`: cancellation-update helper.
- `src/lib/visits/validation.test.ts`: regression test for clearing `completed_at`.
- `src/app/visits/actions.ts`: consumes the helper.
- `src/app/page.tsx`: home-only final-section bottom padding.
- `src/lib/meals/queries.ts`: owned-list and owned-detail queries.
- `src/lib/meals/queries.test.ts`: query-model tests.
- `src/app/me/meal-records/actions.ts`: secure update/delete actions.
- `src/app/me/meal-records/[id]/page.tsx`: editor page.
- `src/components/me/MealRecordList.tsx`: record list and delete controls.
- `src/components/me/ManagedMealRecordForm.tsx`: client-side menu/input selector.
- `src/app/me/page.tsx`: list and feedback integration.

### Task 1: Constraint-safe visit cancellation and home spacing

**Files:**
- Modify: `src/lib/visits/validation.ts`
- Modify: `src/lib/visits/validation.test.ts`
- Modify: `src/app/visits/actions.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces `getCancelledVisitUpdate(now: string): { status: "cancelled"; cancelled_at: string; completed_at: null; updated_at: string }`.

- [ ] **Step 1: Write the failing test**

```ts
it("clears completion time while cancelling a completed visit", () => {
  expect(getCancelledVisitUpdate("2026-07-23T03:30:00.000Z")).toEqual({
    status: "cancelled", cancelled_at: "2026-07-23T03:30:00.000Z", completed_at: null, updated_at: "2026-07-23T03:30:00.000Z",
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/lib/visits/validation.test.ts`

Expected: FAIL because `getCancelledVisitUpdate` does not exist.

- [ ] **Step 3: Implement the minimal helper and consume it**

```ts
export function getCancelledVisitUpdate(now: string) {
  return { status: "cancelled" as const, cancelled_at: now, completed_at: null, updated_at: now };
}
```

Replace the cancellation action's inline update object with `getCancelledVisitUpdate(now)`. Add `pb-6 sm:pb-8` to the root `main` in `src/app/page.tsx`; retain the existing AppShell safe-area spacing.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test -- src/lib/visits/validation.test.ts src/app/page.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/visits/validation.ts src/lib/visits/validation.test.ts src/app/visits/actions.ts src/app/page.tsx && git commit -m "fix: cancel completed visits safely"`

### Task 2: Owned meal-record query models and secure mutations

**Files:**
- Modify: `src/lib/meals/queries.ts`
- Create: `src/lib/meals/queries.test.ts`
- Create: `src/app/me/meal-records/actions.ts`
- Create: `src/app/me/meal-records/actions.test.ts`

**Interfaces:**
- Produces `ManagedMealRecord` containing `id`, `restaurantId`, `restaurantName`, `menuItemId`, `menuName`, `paidPrice`, and `createdAt`.
- Produces `getMealRecordsForEmployee(employeeId)` and `getMealRecordForEmployee(employeeId, recordId)`.
- Produces `updateMealRecord(recordId, formData)` and `deleteMealRecord(recordId)`.

- [ ] **Step 1: Write failing ownership and mapping tests**

```ts
it("maps records owned by the employee", async () => {
  mockMealQuery.mockResolvedValue({ data: [{ id: "record-1", restaurant_id: "r-1", menu_item_id: null, menu_name_snapshot: "Bibimbap", paid_price: 9000, created_at: "2026-07-23T03:00:00.000Z", restaurants: { name: "Lunch House" } }], error: null });
  await expect(getMealRecordsForEmployee("employee-1")).resolves.toMatchObject([{ id: "record-1", restaurantName: "Lunch House", paidPrice: 9000 }]);
});
```

```ts
it("redirects without a write when the record is not owned", async () => {
  vi.mocked(getMealRecordForEmployee).mockResolvedValue(null);
  await expect(updateMealRecord("11111111-1111-4111-8111-111111111111", new FormData())).rejects.toThrow("redirect:/me?mealStatus=not_found");
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/lib/meals/queries.test.ts src/app/me/meal-records/actions.test.ts`

Expected: FAIL because the models and actions are absent.

- [ ] **Step 3: Implement ownership-safe queries and actions**

```ts
export interface ManagedMealRecord extends MealRecord {
  restaurantId: string;
  restaurantName: string;
  createdAt: string;
}
```

Both queries select from `meal_records`, filter with `.eq("employee_id", employeeId)`, join `restaurants(name)`, and order lists by `created_at` descending. Each action loads the owned record before any mutation, derives its restaurant ID server-side, parses `normalizeMealRecordFormData(formData)` with `mealRecordSchema`, validates a selected menu's restaurant, and writes with both `id` and `employee_id` filters. Delete only removes the `meal_records` row.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test -- src/lib/meals/queries.test.ts src/app/me/meal-records/actions.test.ts src/lib/meals/validation.test.ts`

Expected: PASS, including invalid input, invalid menu, and non-owned record paths.

- [ ] **Step 5: Commit**

Run: `git add src/lib/meals/queries.ts src/lib/meals/queries.test.ts src/app/me/meal-records/actions.ts src/app/me/meal-records/actions.test.ts && git commit -m "feat: manage owned meal records"`

### Task 3: My Info list and dedicated meal-record editor

**Files:**
- Create: `src/components/me/MealRecordList.tsx`
- Create: `src/components/me/MealRecordList.test.tsx`
- Create: `src/components/me/ManagedMealRecordForm.tsx`
- Create: `src/components/me/ManagedMealRecordForm.test.tsx`
- Create: `src/app/me/meal-records/[id]/page.tsx`
- Create: `src/app/me/meal-records/[id]/page.test.tsx`
- Modify: `src/app/me/page.tsx`

**Interfaces:**
- `MealRecordList` takes `ManagedMealRecord[]`, edit links, and `deleteMealRecord` forms.
- `ManagedMealRecordForm` takes `record` and restaurant menu items; its form action is `updateMealRecord.bind(null, record.id)`.

- [ ] **Step 1: Write failing component tests**

```tsx
it("shows a record with edit and delete controls", () => {
  render(<MealRecordList records={[{ id: "record-1", restaurantId: "r-1", restaurantName: "Lunch House", menuItemId: null, menuName: "Bibimbap", paidPrice: 9000, createdAt: "2026-07-23T03:00:00.000Z" }]} />);
  expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute("href", "/me/meal-records/record-1");
  expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
});
```

```tsx
it("disables direct menu input after selecting a registered menu", () => {
  render(<ManagedMealRecordForm record={record} menuItems={[{ id: "menu-1", name: "Bibimbap", price: 9000 }]} />);
  fireEvent.change(screen.getByLabelText("등록 메뉴"), { target: { value: "menu-1" } });
  expect(screen.getByLabelText("직접 입력 메뉴명")).toBeDisabled();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/components/me/MealRecordList.test.tsx src/components/me/ManagedMealRecordForm.test.tsx`

Expected: FAIL because the components are absent.

- [ ] **Step 3: Implement the UI**

Render a compact `식사 기록` section in My Info using `getMealRecordsForEmployee(employee.id)` and show restaurant, menu, paid price, and Asia/Seoul-formatted record date. Whitelist only `saved`, `deleted`, and `not_found` status values. The editor redirects unauthenticated users to login and absent/non-owned records to `/me?mealStatus=not_found`; it loads menu items for the owned record's restaurant only. Preserve the existing menu-selection/direct-input behavior by copying only the client form logic, not changing the review flow.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test -- src/components/me/MealRecordList.test.tsx src/components/me/ManagedMealRecordForm.test.tsx src/app/me/meal-records/[id]/page.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/me src/app/me/page.tsx src/app/me/meal-records && git commit -m "feat: show meal records in my info"`

### Task 4: Required verification

**Files:** No production-file changes expected.

- [ ] **Step 1: Run all required checks**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`

Expected: all commands exit with status 0.

- [ ] **Step 2: Manually verify the regression**

Run `npm run dev`, complete a same-day visit, then select `방문 취소` on the home page.

Expected: the app redirects to `/?visitStatus=cancelled` without a 500, and the pre-existing meal record is still listed under My Info and can be edited or deleted.

## Plan Self-Review

- Task 1 covers the database-constraint failure and home spacing.
- Task 2 covers ownership, source-independent editing, menu validation, and delete scope.
- Task 3 covers the requested employee-facing management UI.
- No migration is needed because `meal_records` already contains the required data and foreign keys.
