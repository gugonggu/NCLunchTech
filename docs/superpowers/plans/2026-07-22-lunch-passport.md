# 점심 여권 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 완료 방문 데이터를 바탕으로 개인의 식당 수집 진행률과 카테고리별 방문 이력을 도감에 표시한다.

**Architecture:** 순수 모듈은 활성 식당과 정규화한 방문 행을 받아 전체·카테고리·식당별 여권 결과를 계산한다. 서버 전용 쿼리는 개인·방장·참여 완료 방문을 가져와 정규화하며, 도감 전용 카드가 이 결과를 표시한다.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, Supabase service-role query, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- 활성 식당만 여권의 분모와 수집 항목에 포함한다.
- 완료 방문은 개인 방문, 완료된 동행 방장 기록, 완료된 동행 참여 기록을 모두 포함한다.
- 전체 완료율과 카테고리 완료율은 방문한 고유 식당 수로 계산한다.
- 식당별 방문 횟수는 모든 완료 방문을 누적하고, 첫·최근 방문일은 Asia/Seoul 날짜를 사용한다.
- 데이터베이스 스키마·추천·방문·동행·리뷰 저장 방식은 변경하지 않는다.
- 배지·보상·레벨·시즌·수동 편집·과거 기간 탐색·비활성 식당은 만들지 않는다.
- 기존 도감 필터·즐겨찾기·전체 식당 목록을 유지한다.

---

### Task 1: 순수 여권 집계

**Files:**
- Create: `src/lib/lunch-passport.ts`
- Create: `src/lib/lunch-passport.test.ts`

**Interfaces:**
- Produces: `buildLunchPassport(restaurants, visits): LunchPassport`.
- Produces: `LunchPassport` with `totalRestaurantCount`, `visitedRestaurantCount`, `completionRate`, and `categories`.
- Produces: category entries with `category`, `totalRestaurantCount`, `visitedRestaurantCount`, `completionRate`, and `restaurants`.

- [ ] **Step 1: Write the failing test**

Create active 한식·중식 restaurants plus inactive restaurant and three normalized visits. Assert one restaurant has `visitCount: 2`, `firstVisitedOn: "2026-07-01"`, `lastVisitedOn: "2026-07-10"`, total completion is `2/3`, and the unvisited category has empty `restaurants`.

```ts
const passport = buildLunchPassport(
  [
    { id: "r1", name: "가람", category: "한식", isActive: true },
    { id: "r2", name: "나루", category: "한식", isActive: true },
    { id: "r3", name: "다온", category: "중식", isActive: true },
  ],
  [
    { restaurantId: "r1", visitedOn: "2026-07-01" },
    { restaurantId: "r1", visitedOn: "2026-07-10" },
    { restaurantId: "r3", visitedOn: "2026-07-05" },
  ]
);
expect(passport).toMatchObject({ totalRestaurantCount: 3, visitedRestaurantCount: 2 });
```

Add empty-input, inactive-restaurant exclusion, per-category completion, and Korean-name order tests.

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd test -- src/lib/lunch-passport.test.ts`

Expected: FAIL because the passport module does not exist.

- [ ] **Step 3: Write minimal implementation**

Export these interfaces and aggregate only active restaurant IDs:

```ts
export interface LunchPassportRestaurant { id: string; name: string; category: string; isActive: boolean }
export interface LunchPassportVisit { restaurantId: string; visitedOn: string }
export interface PassportRestaurantVisit { restaurantId: string; restaurantName: string; visitCount: number; firstVisitedOn: string; lastVisitedOn: string }
export interface LunchPassport { totalRestaurantCount: number; visitedRestaurantCount: number; completionRate: number; categories: PassportCategory[] }
```

Use a `Map<string, string[]>` for visits, count each unique restaurant once for rates, sort visible restaurant entries by name with `localeCompare("ko")`, and use `0` when a denominator is zero.

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm.cmd test -- src/lib/lunch-passport.test.ts`

Expected: all pure aggregation tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/lunch-passport.ts src/lib/lunch-passport.test.ts
git commit -m "feat: calculate lunch passport progress"
```

### Task 2: 서버 조회와 여권 카드

**Files:**
- Create: `src/lib/lunch-passport-queries.ts`
- Create: `src/components/collection/LunchPassportCard.tsx`
- Create: `src/components/collection/LunchPassportCard.test.tsx`

**Interfaces:**
- Consumes: `buildLunchPassport` from Task 1.
- Produces: `getLunchPassport(employeeId): Promise<LunchPassport>`.
- Produces: `<LunchPassportCard passport={LunchPassport} />`.

- [ ] **Step 1: Write failing card tests**

Render a passport with one visited and one unvisited category. Assert heading `점심 여권`, `2/5곳 방문`, a visited restaurant detail link `/restaurants/r1`, visit count, first/recent date labels, and `아직 방문 전` for the empty category.

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd test -- src/components/collection/LunchPassportCard.test.tsx`

Expected: FAIL because the card does not exist.

- [ ] **Step 3: Write query and card implementation**

`getLunchPassport` fetches `restaurants(id, name, category, is_active)`, completed `visits(restaurant_id, visit_date)` for the employee, completed hosted `appointments(restaurant_id, scheduled_at)`, and completed `appointment_participants(appointments(restaurant_id, scheduled_at))` for the employee. Convert appointment timestamps to Asia/Seoul `YYYY-MM-DD`, then pass rows to Task 1.

Use `Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" })` only for card display. Render a summary card, category progress, a visited restaurant list with first/recent date and count, plus the empty-category copy.

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm.cmd test -- src/components/collection/LunchPassportCard.test.tsx`

Expected: presentation and empty-category tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/lunch-passport-queries.ts src/components/collection/LunchPassportCard.tsx src/components/collection/LunchPassportCard.test.tsx
git commit -m "feat: add lunch passport card"
```

### Task 3: 도감 연결과 전체 검증

**Files:**
- Modify: `src/app/collection/page.tsx`
- Create: `src/app/collection/page.test.tsx`

**Interfaces:**
- Consumes: `getLunchPassport(employeeId)` and `LunchPassportCard` from Task 2.
- Produces: a passport card directly below the 도감 heading and before existing category breakdown.

- [ ] **Step 1: Write failing page tests**

Mock authenticated employee, active restaurant fetches, existing collection queries, and `getLunchPassport`. Assert the card is rendered before `분류별 현황`; add an empty-passport result test that still renders the `0/0곳 방문` summary and does not alter the existing list.

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd test -- src/app/collection/page.test.tsx`

Expected: FAIL because the collection page does not query or render the passport.

- [ ] **Step 3: Integrate the card**

Request `getLunchPassport(employee.id)` alongside existing collection reads and render `<LunchPassportCard passport={passport} />` after the `도감` heading. Preserve all existing filters, favorite handling, breakdown, and list queries.

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm.cmd test -- src/app/collection/page.test.tsx`

Expected: new card and empty-state tests PASS.

- [ ] **Step 5: Run complete verification and commit**

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Expected: each command exits 0. Then commit:

```powershell
git add src/app/collection/page.tsx src/app/collection/page.test.tsx
git commit -m "feat: show lunch passport in collection"
```
