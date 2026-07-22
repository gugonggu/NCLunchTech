# 오늘 같이 먹기 상태 공유 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직원이 오늘 점심 상태를 공개하고 홈에서 동료의 상태를 확인·변경하게 한다.

**Architecture:** 순수 상태 정의·그룹화는 `src/lib/lunch-availability/validation.ts`에, 서비스 롤 전용 DB 작업은 `queries.ts`에 둔다. 홈 Server Component가 오늘 상태를 불러오고, 클라이언트 카드의 Server Action은 세션과 서울 날짜를 서버에서 확정한다.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Tailwind CSS, Supabase PostgreSQL, Vitest, Testing Library

## Global Constraints

- 날짜는 `getSeoulDateString(new Date())`로 서버에서 계산하며 클라이언트 입력을 신뢰하지 않는다.
- 상태는 `looking_for_company`, `has_appointment`, `eating_alone`, `away_or_skipping`만 허용한다.
- 로그인한 직원은 상태를 등록한 모든 동료의 닉네임과 상태를 본다.
- 직원당 하루 한 행만 저장하며 자동 초대·약속·알림·통계·예약은 만들지 않는다.
- 새 동작은 반드시 실패하는 테스트를 확인한 후 구현한다.

---

### Task 1: 상태 모델과 DB 마이그레이션

**Files:**
- Create: `supabase/migrations/0033_lunch_availabilities.sql`
- Create: `src/lib/lunch-availability/validation.ts`
- Create: `src/lib/lunch-availability/validation.test.ts`

**Interfaces:**
- Produces: `LunchAvailabilityStatus`, `LUNCH_AVAILABILITY_OPTIONS`, `isLunchAvailabilityStatus(value: string)`, `groupLunchAvailabilities(rows)`.

- [ ] **Step 1: Write the failing test**

```ts
it("accepts only supported statuses", () => {
  expect(isLunchAvailabilityStatus("looking_for_company")).toBe(true);
  expect(isLunchAvailabilityStatus("away_or_skipping")).toBe(true);
  expect(isLunchAvailabilityStatus("working")).toBe(false);
});

it("groups statuses in fixed display order", () => {
  expect(groupLunchAvailabilities([
    { employeeId: "e2", nickname: "나래", status: "eating_alone" },
    { employeeId: "e1", nickname: "가온", status: "looking_for_company" },
  ])[0]).toEqual({
    status: "looking_for_company",
    employees: [{ employeeId: "e1", nickname: "가온" }],
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/lunch-availability/validation.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

Create the table with `id`, `employee_id references employees(id) on delete cascade`, `availability_date`, `status`, timestamps, a status check constraint, and unique `(employee_id, availability_date)`. Add an index on `availability_date`, enable RLS, and add no policies. Define the ordered options below and derive the union type from them. Initialize one group for every option and append rows to the matching group.

```ts
export const LUNCH_AVAILABILITY_OPTIONS = [
  { value: "looking_for_company", label: "같이 먹을 사람을 구해요" },
  { value: "has_appointment", label: "이미 약속이 있어요" },
  { value: "eating_alone", label: "오늘은 혼자 먹어요" },
  { value: "away_or_skipping", label: "외근 또는 점심을 먹지 않아요" },
] as const;
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/lib/lunch-availability/validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0033_lunch_availabilities.sql src/lib/lunch-availability/validation.ts src/lib/lunch-availability/validation.test.ts
git commit -m "feat: add lunch availability data model"
```

### Task 2: 서버 조회와 상태 변경

**Files:**
- Create: `src/lib/lunch-availability/queries.ts`
- Create: `src/lib/lunch-availability/queries.test.ts`
- Create: `src/app/lunch-availability/actions.ts`

**Interfaces:**
- Consumes: Task 1 status type and validator, `getCurrentEmployee`, `getSeoulDateString`.
- Produces: `LunchAvailability`, `getLunchAvailabilities(date)`, `setMyLunchAvailability(status)`, `clearMyLunchAvailability()`.

- [ ] **Step 1: Write the failing test**

```ts
it("maps a joined row into a public availability", () => {
  expect(toLunchAvailability({
    employee_id: "employee-1",
    status: "looking_for_company",
    employees: { nickname: "홍천" },
  })).toEqual({ employeeId: "employee-1", nickname: "홍천", status: "looking_for_company" });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/lunch-availability/queries.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

Select `employee_id, status, employees(nickname)` for the specified `availability_date`, ordered by nickname. Map missing employee joins to `null` and remove them. In actions, authenticate first; validate status; calculate today on the server; upsert by `employee_id,availability_date`; call `revalidatePath("/")`. Clear only the authenticated employee's row for today and revalidate the home path.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/lib/lunch-availability/queries.test.ts src/lib/lunch-availability/validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lunch-availability/queries.ts src/lib/lunch-availability/queries.test.ts src/app/lunch-availability/actions.ts
git commit -m "feat: store daily lunch availability"
```

### Task 3: 홈 상태 공유 카드

**Files:**
- Create: `src/components/lunch/LunchAvailabilityCard.tsx`
- Create: `src/components/lunch/LunchAvailabilityCard.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: Task 1 groups and Task 2 rows/actions.
- Produces: `오늘 같이 먹기` card with current employee controls and all public groups.

- [ ] **Step 1: Write the failing test**

```tsx
it("shows empty state and all status choices", () => {
  render(<LunchAvailabilityCard employeeId="me" availabilities={[]} />);
  expect(screen.getByText("아직 오늘의 점심 상태를 공유한 동료가 없어요.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "같이 먹을 사람을 구해요" })).toBeInTheDocument();
});

it("shows public nicknames and the looking-for-company count", () => {
  render(<LunchAvailabilityCard employeeId="me" availabilities={[
    { employeeId: "me", nickname: "홍천", status: "looking_for_company" },
    { employeeId: "other", nickname: "나래", status: "has_appointment" },
  ]} />);
  expect(screen.getByText("같이 먹을 사람을 구해요 · 1명")).toBeInTheDocument();
  expect(screen.getByText("홍천")).toBeInTheDocument();
  expect(screen.getByText("나래")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "상태 해제" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/components/lunch/LunchAvailabilityCard.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Write minimal implementation**

Build a client component with `Card` and `Button`. Bind a form per option to `setMyLunchAvailability` and bind the clear button to `clearMyLunchAvailability`. Hide empty groups, except show the documented full-card empty state when no rows exist. Show the current employee's selected label and count the first group. In `page.tsx`, fetch the rows with today's date and place the card immediately after `HomeHero`; mock that query in `page.test.tsx`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/components/lunch/LunchAvailabilityCard.test.tsx src/app/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/lunch/LunchAvailabilityCard.tsx src/components/lunch/LunchAvailabilityCard.test.tsx src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: show lunch availability on home"
```

### Task 4: Complete verification

**Files:**
- Modify: only files required to correct a failure from the following commands.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run all unit tests**

Run: `npm test`

Expected: exit code 0.

- [ ] **Step 4: Build**

Run: `npm run build`

Expected: exit code 0.
