# 함께 먹기 식당 검색·선택 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/appointments/new`에서 전체 식당을 애플리케이션 메모리로 읽지 않고 Supabase RPC로 검색·필터·정렬·페이지 이동한 뒤 기존 약속 생성 폼으로 연결한다.

**Architecture:** `0028` 마이그레이션이 bounding box와 Haversine 거리 계산을 포함한 서비스 롤 전용 검색 RPC를 제공한다. 서버 전용 검색 모듈이 URL 조건을 정규화하고 RPC 응답을 화면용 결과로 변환하며, 별도 서버 컴포넌트가 GET 검색 폼과 20개 단위 페이지 링크를 렌더링한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Supabase PostgreSQL, Zod 4, Tailwind CSS 4, Vitest, Testing Library

## Global Constraints

- 페이지 크기는 정확히 `20`이다.
- 허용 반경은 `300`, `500`, `800`, `1200`, `2000`m이고 기본 정렬은 `distance`다.
- 검색어는 앞뒤 공백을 제거하고 최대 50자로 제한한다.
- `openNow`는 Asia/Seoul 현재 시각을 사용하며 익일 영업은 지원하지 않는다.
- 약속 생성 Server Action, 참여자 처리, 기존 `restaurantId`, `status`, `fromPollId` 이름을 변경하지 않는다.
- `public`, `anon`, `authenticated`에는 RPC 실행 권한을 주지 않고 `service_role`에만 부여한다.
- 새로운 클라이언트 상태 라이브러리와 무한 스크롤을 추가하지 않는다.

---

### Task 1: 검색 RPC와 데이터베이스 계약

**Files:**
- Create: `supabase/migrations/0028_appointment_restaurant_search.sql`
- Create: `src/lib/appointments/migration-0028.test.ts`
- Create: `tests/integration/appointment-restaurant-search.test.ts`
- Modify: `tests/support/db-helpers.ts`

**Interfaces:**
- Produces: `public.search_appointment_restaurants(p_query text, p_category text, p_radius_m integer, p_open_now boolean, p_sort text, p_page integer, p_page_size integer)`
- Returns: `(id uuid, kakao_place_id text, name text, category text, address text, distance_m integer, is_open_now boolean, total_count bigint, page_number integer)`
- Errors: SQLSTATE `P0001` with message `company_location_missing` when company coordinates are absent

- [ ] **Step 1: Write the failing migration contract test**

Create `src/lib/appointments/migration-0028.test.ts` and read the migration with `readFileSync`. Assert the exact function name and parameters, `security invoker`, active filter, Seoul timezone expression, bounding-box predicates, Haversine calculation, stable secondary `id` ordering, `limit`, `offset`, and all four revoke/grant statements.

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/0028_appointment_restaurant_search.sql", "utf8");

describe("migration 0028", () => {
  it("defines a bounded service-role-only appointment restaurant search", () => {
    expect(sql).toMatch(/create or replace function public\.search_appointment_restaurants/i);
    expect(sql).toMatch(/security invoker/i);
    expect(sql).toMatch(/r\.is_active = true/i);
    expect(sql).toMatch(/timezone\('Asia\/Seoul', now\(\)\)/i);
    expect(sql).toMatch(/revoke execute on function public\.search_appointment_restaurants[\s\S]+from public/i);
    expect(sql).toMatch(/from anon/i);
    expect(sql).toMatch(/from authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.search_appointment_restaurants[\s\S]+to service_role/i);
  });
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `npm.cmd run test -- src/lib/appointments/migration-0028.test.ts`

Expected: FAIL because `0028_appointment_restaurant_search.sql` does not exist.

- [ ] **Step 3: Implement the migration**

Create the SQL with `create extension if not exists pg_trgm`, partial trigram/category/created-at/coordinate indexes for `where is_active = true`, and a PL/pgSQL function. Normalize `p_radius_m`, `p_sort`, `p_page`, and `p_page_size` inside the function; calculate latitude and longitude deltas before exact distance; calculate `is_open_now` from the matching `restaurant_hours.day_of_week`; filter and count in CTEs; clamp the requested page; return a stable `case` ordering plus `id`, `limit v_page_size`, and `offset (v_page - 1) * v_page_size`.

The privilege footer must use the complete signature:

```sql
revoke execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) from public;
revoke execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) from anon;
revoke execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) from authenticated;
grant execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) to service_role;
```

- [ ] **Step 4: Add an isolated integration test**

Extend `createTestRestaurant` overrides with `category`, `lat`, `lng`, and `isActive`; add `replaceTestRestaurantHours(restaurantId, rows)` that deletes existing hours and inserts the supplied seven-day rows. In `tests/integration/appointment-restaurant-search.test.ts`, create 23 uniquely prefixed active restaurants near the company coordinates plus one inactive and one outside 2km. Assert name/category/radius/open filters, `distance`/`name`/`new` ordering, `total_count = 23`, first page length 20, second page length 3, and an oversized page returning page 2.

Use the service-role client directly:

```ts
const { data, error } = await supabase.rpc("search_appointment_restaurants", {
  p_query: prefix,
  p_category: "",
  p_radius_m: 2000,
  p_open_now: false,
  p_sort: "name",
  p_page: 1,
  p_page_size: 20,
});
expect(error).toBeNull();
expect(data).toHaveLength(20);
expect(data?.[0].total_count).toBe(23);
```

- [ ] **Step 5: Run database tests**

Run: `npm.cmd run test -- src/lib/appointments/migration-0028.test.ts`

Expected: PASS.

After applying migration `0028` to the isolated test project, run: `npm.cmd run test:integration -- tests/integration/appointment-restaurant-search.test.ts`

Expected: PASS. If `.env.test.local` is unavailable, record the integration test as not run; never connect it to the development project.

- [ ] **Step 6: Commit the database contract**

```powershell
git add supabase/migrations/0028_appointment_restaurant_search.sql src/lib/appointments/migration-0028.test.ts tests/integration/appointment-restaurant-search.test.ts tests/support/db-helpers.ts
git commit -m "feat: add appointment restaurant search rpc"
```

### Task 2: URL normalization and server search adapter

**Files:**
- Create: `src/lib/appointments/restaurant-search.ts`
- Create: `src/lib/appointments/restaurant-search.test.ts`

**Interfaces:**
- Produces: `normalizeAppointmentRestaurantSearch(raw: AppointmentRestaurantSearchParams): NormalizedAppointmentRestaurantSearch`
- Produces: `searchAppointmentRestaurants(raw): Promise<AppointmentRestaurantSearchState>`
- State union: `{ status: "ready"; items; totalCount; page; totalPages; filters } | { status: "empty"; filters } | { status: "location-missing"; filters } | { status: "error"; filters }`

- [ ] **Step 1: Write failing normalization and RPC adapter tests**

Mock `createServiceRoleClient().rpc`. Cover trimmed/capped `q`, allowed category/radius/sort, positive integer page, invalid defaults, exact RPC parameter names, row conversion, zero rows, `company_location_missing`, and a generic error.

```ts
expect(normalizeAppointmentRestaurantSearch({ q: `  ${"가".repeat(60)}  `, radius: "999", page: "-2" })).toEqual({
  q: "가".repeat(50), category: "", radius: 800, openNow: false, sort: "distance", page: 1,
});

expect(mocks.rpc).toHaveBeenCalledWith("search_appointment_restaurants", {
  p_query: "김밥", p_category: "한식", p_radius_m: 500, p_open_now: true,
  p_sort: "name", p_page: 2, p_page_size: 20,
});
```

- [ ] **Step 2: Run tests and verify missing-module failure**

Run: `npm.cmd run test -- src/lib/appointments/restaurant-search.test.ts`

Expected: FAIL because `restaurant-search.ts` does not exist.

- [ ] **Step 3: Implement the adapter and types**

Define `APPOINTMENT_RESTAURANT_PAGE_SIZE = 20`, the raw/normalized types, `AppointmentRestaurantSearchItem`, and the discriminated state union. Use `RESTAURANT_CATEGORIES`, `RADIUS_OPTIONS_M`, and `DEFAULT_RADIUS_M`; call the RPC only from `searchAppointmentRestaurants`; convert numeric strings with `Number`; derive `totalPages = Math.max(1, Math.ceil(totalCount / 20))`; recognize location failure only when `error.code === "P0001" && error.message === "company_location_missing"`.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd run test -- src/lib/appointments/restaurant-search.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```powershell
git add src/lib/appointments/restaurant-search.ts src/lib/appointments/restaurant-search.test.ts
git commit -m "feat: add appointment restaurant search adapter"
```

### Task 3: Search picker server component

**Files:**
- Create: `src/app/appointments/new/RestaurantPicker.tsx`
- Create: `src/app/appointments/new/RestaurantPicker.test.tsx`

**Interfaces:**
- Consumes: `AppointmentRestaurantSearchState`
- Produces: `RestaurantPicker({ state })`
- Navigation: GET fields `q`, `category`, `radius`, `openNow`, `sort`; selection link `/appointments/new?restaurantId=<id>`

- [ ] **Step 1: Write failing rendering and navigation tests**

Render ready, empty, location-missing, and error states. Assert all labels and current values; `총 21개 · 2/2페이지`; status text; selection URL; previous/next links preserving filters; disabled boundary navigation; reset/retry links.

```tsx
expect(screen.getByRole("textbox", { name: "식당 이름" })).toHaveValue("김밥");
expect(screen.getByRole("link", { name: /테스트 식당/ })).toHaveAttribute(
  "href", "/appointments/new?restaurantId=r1",
);
expect(screen.getByRole("link", { name: "이전" })).toHaveAttribute(
  "href", "/appointments/new?q=%EA%B9%80%EB%B0%A5&category=%ED%95%9C%EC%8B%9D&radius=500&openNow=on&sort=name&page=1",
);
```

- [ ] **Step 2: Verify tests fail**

Run: `npm.cmd run test -- src/app/appointments/new/RestaurantPicker.test.tsx`

Expected: FAIL because `RestaurantPicker.tsx` does not exist.

- [ ] **Step 3: Implement the GET picker**

Use a single `<form method="get">`. Render search, category, radius, open-now checkbox, sort, and submit controls with associated labels. Build pagination URLs with `URLSearchParams`, omitting empty/default values except `page`. Each result card displays name, category, address, integer distance in metres, and `영업 중`/`영업 종료`; make the whole card a minimum-44px link. Use `FeedbackState` for the three non-ready outcomes.

- [ ] **Step 4: Run component tests**

Run: `npm.cmd run test -- src/app/appointments/new/RestaurantPicker.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the picker**

```powershell
git add src/app/appointments/new/RestaurantPicker.tsx src/app/appointments/new/RestaurantPicker.test.tsx
git commit -m "feat: add searchable appointment restaurant picker"
```

### Task 4: Page integration and Kakao map link

**Files:**
- Modify: `src/app/appointments/new/page.tsx`
- Modify: `src/app/appointments/new/page.test.tsx`

**Interfaces:**
- Consumes: `searchAppointmentRestaurants(searchParams)` and `RestaurantPicker`
- Selected restaurant query adds `kakao_place_id`
- Preserves: `createAppointment.bind(null, restaurant.id)` and authentication redirects

- [ ] **Step 1: Replace obsolete list-query tests with failing integration tests**

Mock `searchAppointmentRestaurants`. Assert the no-ID branch calls it with raw search params and renders its picker result without `.from("restaurants").order(...)`. Update the selected query expectation to `id, kakao_place_id, name, category`; assert an exact Kakao URL with `_blank` and `noopener noreferrer`; assert no link when the place ID is null. Retain unauthenticated redirect, inactive/missing 404, status feedback, and existing form tests.

- [ ] **Step 2: Run the page test and verify failure**

Run: `npm.cmd run test -- src/app/appointments/new/page.test.tsx`

Expected: FAIL because the page still loads every active restaurant and does not select `kakao_place_id`.

- [ ] **Step 3: Integrate search and map link**

Expand `NewAppointmentSearchParams` with `q`, `category`, `radius`, `openNow`, `sort`, and `page`. In the no-ID branch return `<RestaurantPicker state={await searchAppointmentRestaurants(params)} />`. In the selected branch query `id, kakao_place_id, name, category` and render only a non-empty place ID:

```tsx
{restaurant.kakao_place_id ? (
  <a
    href={`https://place.map.kakao.com/${restaurant.kakao_place_id}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline"
  >
    카카오맵에서 보기
  </a>
) : null}
```

- [ ] **Step 4: Run appointment tests and static checks**

Run: `npm.cmd run test -- src/app/appointments/new/page.test.tsx src/app/appointments/new/RestaurantPicker.test.tsx src/lib/appointments/restaurant-search.test.ts src/lib/appointments/migration-0028.test.ts`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit page integration**

```powershell
git add src/app/appointments/new/page.tsx src/app/appointments/new/page.test.tsx
git commit -m "feat: search restaurants before creating appointments"
```

### Task 5: End-to-end verification

**Files:**
- No production file changes expected

**Interfaces:**
- Verifies the complete appointment search flow without changing its contract

- [ ] **Step 1: Run required project verification**

Run sequentially:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Expected: every command exits with code 0.

- [ ] **Step 2: Verify in the authenticated browser**

At desktop and mobile widths, open `http://localhost:3000/appointments/new`; verify initial 20 results, each filter, previous/next preservation, empty/reset state, restaurant selection, existing appointment form, and `카카오맵에서 보기` opening the exact Kakao place URL in a new tab.

- [ ] **Step 3: Record optional integration status**

If the isolated test Supabase is configured and migration `0028` is applied, rerun `npm.cmd run test:integration -- tests/integration/appointment-restaurant-search.test.ts` and record PASS. Otherwise explicitly report that optional integration verification was not run.
