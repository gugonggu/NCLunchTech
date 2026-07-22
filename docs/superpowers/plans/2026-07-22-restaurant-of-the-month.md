# 이번 달의 식당 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이번 달에 가장 많이 실제로 방문한 식당 한 곳을 결정하고 홈과 리더보드에 노출한다.

**Architecture:** `restaurant-of-the-month.ts`는 월 범위 안의 완료 방문과 리뷰 행을 받아 결정적인 결과 한 건 또는 `null`을 반환하는 순수 모듈이다. 서버 전용 쿼리는 개인 방문과 동행 완료 기록을 같은 입력 형태로 정규화하며, 작은 재사용 카드가 홈과 리더보드의 표시를 맡는다.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, Supabase service-role query, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- 기준 시간대와 월 경계는 `Asia/Seoul` 및 기존 `getSeoulMonthRange`를 사용한다.
- 후보는 그 달 완료 방문이 한 건 이상인 활성 식당이며, 리뷰가 없어도 후보에서 제외하지 않는다.
- 완료 방문 수, 평균 맛 점수(리뷰 있는 후보 우선), 최신 완료 방문, 이름 오름차순 순으로 결정한다.
- 개인 완료 방문, 완료된 동행의 방장 기록 및 완료된 참여 기록을 모두 방문 수에 포함한다.
- 새 데이터베이스 스키마·마이그레이션, 월별 이력·수동 선정·배지·과거 월 탐색은 만들지 않는다.
- 사용자 문구는 한국어로 유지하고, 카드의 상세 연결은 `/restaurants/{restaurantId}`를 사용한다.
- 기능 코드 전에 실패하는 테스트를 실행해 RED를 확인한다. 최종 검증은 `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`다.

---

### Task 1: 순수 선정 규칙

**Files:**
- Create: `src/lib/restaurant-of-the-month.ts`
- Create: `src/lib/restaurant-of-the-month.test.ts`

**Interfaces:**
- Produces: `selectRestaurantOfTheMonth(restaurants, activities, now): RestaurantOfTheMonth | null`.
- Produces: `RestaurantOfTheMonth` with `restaurantId`, `restaurantName`, `restaurantCategory`, `completedVisitCount`, `averageTasteRating`, `latestCompletedAt`, `selectionReason`.
- Consumes: `getSeoulMonthRange(now)` from `src/lib/leaderboard.ts`.

- [ ] **Step 1: Write the failing test**

Create tests with this input and assert the taste tie-break:

```ts
const result = selectRestaurantOfTheMonth(
  [
    { id: "a", name: "가람", category: "한식", isActive: true },
    { id: "b", name: "나루", category: "중식", isActive: true },
  ],
  {
    visits: [
      { restaurantId: "a", occurredAt: "2026-07-10T03:00:00.000Z" },
      { restaurantId: "a", occurredAt: "2026-07-11T03:00:00.000Z" },
      { restaurantId: "b", occurredAt: "2026-07-12T03:00:00.000Z" },
      { restaurantId: "b", occurredAt: "2026-07-13T03:00:00.000Z" },
    ],
    reviews: [
      { restaurantId: "a", tasteRating: 4, occurredAt: "2026-07-14T03:00:00.000Z" },
      { restaurantId: "b", tasteRating: 5, occurredAt: "2026-07-14T03:00:00.000Z" },
    ],
  },
  new Date("2026-07-20T03:00:00.000Z")
);
expect(result?.restaurantId).toBe("b");
expect(result?.selectionReason).toBe("highest_taste_rating");
```

Add independent cases proving visit-count priority, missing-review candidates falling through to latest visit, Korean-name ascending final tie-break, out-of-month/inactive rows ignored, and no candidate yielding `null`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/lib/restaurant-of-the-month.test.ts`

Expected: FAIL because the selector module and export do not exist.

- [ ] **Step 3: Write minimal implementation**

Define these exported interfaces:

```ts
export interface RestaurantOfTheMonthRestaurant { id: string; name: string; category: string; isActive: boolean }
export interface RestaurantOfTheMonthActivities {
  visits: Array<{ restaurantId: string; occurredAt: string }>;
  reviews: Array<{ restaurantId: string; tasteRating: number; occurredAt: string }>;
}
export type RestaurantOfTheMonthReason =
  | "most_completed_visits" | "highest_taste_rating" | "latest_completed_visit" | "name_tiebreak";
export interface RestaurantOfTheMonth {
  restaurantId: string; restaurantName: string; restaurantCategory: string;
  completedVisitCount: number; averageTasteRating: number | null;
  latestCompletedAt: string; selectionReason: RestaurantOfTheMonthReason;
}
```

Filter activities with `getSeoulMonthRange(now)`, aggregate only active restaurant IDs, calculate per-candidate average taste, and sort a copied candidate array by the four global criteria. Set `selectionReason` to the first comparator separating winner and runner-up, or `most_completed_visits` for a sole candidate.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/lib/restaurant-of-the-month.test.ts`

Expected: all ranking and empty-state tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/restaurant-of-the-month.ts src/lib/restaurant-of-the-month.test.ts
git commit -m "feat: select restaurant of the month"
```

### Task 2: 서버 쿼리와 공용 카드

**Files:**
- Create: `src/lib/restaurant-of-the-month-queries.ts`
- Create: `src/components/lunch/RestaurantOfTheMonthCard.tsx`
- Create: `src/components/lunch/RestaurantOfTheMonthCard.test.tsx`

**Interfaces:**
- Consumes: `selectRestaurantOfTheMonth` and `RestaurantOfTheMonth` from Task 1.
- Produces: `getRestaurantOfTheMonth(now?: Date): Promise<RestaurantOfTheMonth | null>`.
- Produces: `<RestaurantOfTheMonthCard restaurant={RestaurantOfTheMonth} compact?: boolean />`.

- [ ] **Step 1: Write failing card tests**

Render the card with a `4.5` average, `3` visits and `highest_taste_rating`; assert heading, category, `완료 방문 3회`, `평균 맛 4.5점`, reason copy, and `/restaurants/r-1` link. Add compact-mode assertions retaining link and visit count but omitting category/reason detail.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/components/lunch/RestaurantOfTheMonthCard.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Write minimal query and component implementation**

In `getRestaurantOfTheMonth`, fetch active `restaurants(id, name, category, is_active)`, completed `visits(restaurant_id, visit_date)`, completed host `appointments(restaurant_id, scheduled_at)`, completed `appointment_participants(appointments(restaurant_id, scheduled_at))`, and monthly `reviews(restaurant_id, taste_rating, created_at)`. Convert `visit_date` to noon Seoul ISO timestamps, flatten valid participant appointments, then call the selector.

Render the card as a `Link` with accessible heading `이번 달의 식당`, use `averageTasteRating?.toFixed(1)`, and map all reason values to concise Korean copy. Compact mode renders title, restaurant name, count, and optional taste only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/components/lunch/RestaurantOfTheMonthCard.test.tsx`

Expected: card presentation and compact-mode tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/restaurant-of-the-month-queries.ts src/components/lunch/RestaurantOfTheMonthCard.tsx src/components/lunch/RestaurantOfTheMonthCard.test.tsx
git commit -m "feat: add restaurant of the month card"
```

### Task 3: 홈·리더보드 연결과 빈 상태

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/leaderboard/page.tsx`
- Create: `src/app/leaderboard/page.test.tsx`

**Interfaces:**
- Consumes: `getRestaurantOfTheMonth` and `RestaurantOfTheMonthCard` from Task 2.
- Produces: a home card directly below `LunchAvailabilityCard` and compact leaderboard summary above score categories.

- [ ] **Step 1: Write failing page tests**

Mock `getRestaurantOfTheMonth` in home tests. With a result assert a restaurant link to `/restaurants/r-1`; with `null` assert the heading is absent. In leaderboard tests mock authenticated employee, monthly data, and the new query; assert compact summary is before the first category heading, then assert a `null` result renders no summary.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- src/app/page.test.tsx src/app/leaderboard/page.test.tsx`

Expected: FAIL because neither page fetches or renders the result.

- [ ] **Step 3: Integrate the card**

On home, fetch `restaurantOfTheMonth` with independent existing reads and conditionally render the card immediately after `LunchAvailabilityCard`. On `/leaderboard`, use `Promise.all` for the monthly leaderboard and restaurant result, then conditionally render compact card after the page heading and before `CATEGORY_META` sections. Render no placeholder for `null`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- src/app/page.test.tsx src/app/leaderboard/page.test.tsx`

Expected: new display and no-candidate tests PASS while existing tests remain green.

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
git add src/app/page.tsx src/app/page.test.tsx src/app/leaderboard/page.tsx src/app/leaderboard/page.test.tsx
git commit -m "feat: show restaurant of the month"
```

