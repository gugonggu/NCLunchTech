# Kakao 식당 수집 범위 및 상호명 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 밀집 지역의 Kakao 식당 누락을 줄이고 관리자가 상호명 검색 결과를 선택해 식당을 등록하게 한다.

**Architecture:** 기존 Kakao Local 서버 모듈에 키워드 검색과 거리 필터를 추가한다. 전체 동기화는 400m 고정 격자로 변경하며, 관리자 추가 UI는 검색 결과의 장소 ID와 원래 질의를 서버에서 재검증한 뒤만 저장한다.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Supabase PostgreSQL, Kakao Local REST API, Vitest, Testing Library

## Global Constraints

- 수집·검색 범위는 회사 좌표 기준 2km이며, 날짜·인증·좌표는 항상 서버에서 확정한다.
- Kakao REST API 키와 Supabase service-role 키는 서버 코드에서만 사용한다.
- 등록은 기존 `restaurants.kakao_place_id` 유니크 제약을 따른다.
- 주소/URL 직접 입력, Naver·Google 연동, 자동 동기화는 만들지 않는다.
- 모든 새 동작은 실패 테스트를 먼저 확인한 뒤 구현한다.

---

### Task 1: 고정 400m Kakao 수집 격자

**Files:**
- Modify: `src/lib/restaurants/sync-kakao.ts`
- Modify: `src/lib/restaurants/sync-kakao.test.ts`

**Interfaces:**
- Produces: `buildSearchGrid(center, radiusM, spacingM)` used with `radiusM=2000`, `spacingM=400`; `GRID_CELL_RADIUS_M=400`.

- [ ] **Step 1: Write failing grid tests**

```ts
it("400m 간격 격자가 기존 1km 간격보다 더 많은 검색 지점을 만든다", () => {
  const center = { lat: 35.0, lng: 129.0 };
  expect(buildSearchGrid(center, 2000, 400).length).toBeGreaterThan(
    buildSearchGrid(center, 2000, 1000).length,
  );
});

it("격자는 2km 경계 밖 한 간격까지 검색 지점을 포함한다", () => {
  const grid = buildSearchGrid({ lat: 35.0, lng: 129.0 }, 2000, 400);
  expect(grid.length).toBeGreaterThan(100);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/lib/restaurants/sync-kakao.test.ts`

Expected: the second assertion fails before the production sync constants are updated.

- [ ] **Step 3: Implement the fixed dense search**

Set `GRID_CELL_RADIUS_M` to `400`, call `buildSearchGrid(..., 2000, 400)`, and keep the existing sequential search and `Map<string, KakaoPlace>` deduplication. Do not add recursive subdivision or change the public 2km scope.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd test -- src/lib/restaurants/sync-kakao.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/restaurants/sync-kakao.ts src/lib/restaurants/sync-kakao.test.ts
git commit -m "feat: densify Kakao restaurant sync grid"
```

### Task 2: Kakao 상호명 검색과 서버 검증

**Files:**
- Modify: `src/lib/kakao.ts`
- Modify: `src/lib/kakao.test.ts`
- Create: `src/lib/restaurants/kakao-place-import.ts`
- Create: `src/lib/restaurants/kakao-place-import.test.ts`

**Interfaces:**
- Produces: `searchPlacesByKeyword({ query, lat, lng, radiusM }): Promise<KakaoPlace[]>`.
- Produces: `filterPlacesWithinRadius(places, company, maxDistanceM): KakaoPlace[]>` and `toRestaurantInsert(place, adminId)`.

- [ ] **Step 1: Write failing unit tests**

```ts
it("keeps a Kakao keyword result at or inside 2km", () => {
  expect(filterPlacesWithinRadius([
    { id: "near", place_name: "복만당", distance: "401" },
    { id: "far", place_name: "먼 식당", distance: "2001" },
  ] as KakaoPlace[], 2000).map((place) => place.id)).toEqual(["near"]);
});

it("maps a verified Kakao place to the existing restaurant insert shape", () => {
  expect(toRestaurantInsert(place, "admin-1")).toMatchObject({
    kakao_place_id: place.id,
    name: place.place_name,
    created_by: "admin-1",
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/lib/restaurants/kakao-place-import.test.ts`

Expected: FAIL because the import module does not exist.

- [ ] **Step 3: Implement minimal server helpers**

Add Kakao keyword search using `/v2/local/search/keyword.json`, passing query, x, y, radius and `sort=distance`. Extend `KakaoPlace` with the returned distance field. Filter parsed distances to `<= 2000`. Make the insert helper reuse `mapKakaoCategory` and generate only the fields accepted by the existing `restaurants` table.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd test -- src/lib/kakao.test.ts src/lib/restaurants/kakao-place-import.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kakao.ts src/lib/kakao.test.ts src/lib/restaurants/kakao-place-import.ts src/lib/restaurants/kakao-place-import.test.ts
git commit -m "feat: add Kakao place import helpers"
```

### Task 3: 관리자 상호명 선택 등록

**Files:**
- Create: `src/app/admin/(protected)/restaurants/KakaoRestaurantAddForm.tsx`
- Create: `src/app/admin/(protected)/restaurants/KakaoRestaurantAddForm.test.tsx`
- Create: `src/app/admin/(protected)/restaurants/kakao-actions.ts`
- Modify: `src/app/admin/(protected)/restaurants/page.tsx`

**Interfaces:**
- Consumes: Task 2 keyword search and insert helper, `getCurrentAdmin`, `logAdminAction`.
- Produces: an admin-only form that searches by name and registers one verified 2km candidate.

- [ ] **Step 1: Write the failing UI test**

```tsx
it("shows only verified nearby candidates and an add button", () => {
  render(<KakaoRestaurantAddForm initialCandidates={[
    { id: "place-1", placeName: "복만당 센텀시티역점", categoryName: "음식점 > 한식", addressName: "부산 해운대구 우동", distanceM: 401 },
  ]} />);
  expect(screen.getByText("복만당 센텀시티역점")).toBeInTheDocument();
  expect(screen.getByText("401m")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "이 식당 추가" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/app/admin/(protected)/restaurants/KakaoRestaurantAddForm.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement search and register actions**

The search action authenticates the admin, validates a trimmed 1–100-character query, loads company coordinates, calls Task 2's keyword search, and returns only 2km candidates. The register action authenticates again, receives `query` and `placeId`, repeats the server keyword search, requires the requested ID to remain in the filtered result, then inserts it. A unique-constraint conflict redirects to the existing restaurant detail; success logs `add_kakao_restaurant_by_name` and redirects to the new detail. Render the form above the existing sync/CSV controls.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd test -- src/app/admin/(protected)/restaurants/KakaoRestaurantAddForm.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(protected)/restaurants/KakaoRestaurantAddForm.tsx src/app/admin/(protected)/restaurants/KakaoRestaurantAddForm.test.tsx src/app/admin/(protected)/restaurants/kakao-actions.ts src/app/admin/(protected)/restaurants/page.tsx
git commit -m "feat: add Kakao restaurant name import"
```

### Task 4: Full verification

- [ ] **Step 1: Run lint**

Run: `npm.cmd run lint`

Expected: exit code 0.

- [ ] **Step 2: Run typecheck**

Run: `npm.cmd run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run all unit tests**

Run: `npm.cmd test`

Expected: exit code 0.

- [ ] **Step 4: Build production output**

Run: `npm.cmd run build`

Expected: exit code 0.
