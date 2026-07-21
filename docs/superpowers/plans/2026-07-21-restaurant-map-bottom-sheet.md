# 식당 지도 바텀시트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/restaurants` 데스크톱 화면에서 바텀시트가 검색 영역 뒤로 들어가지 않게 하고 드래그 또는 명시적 버튼으로 완전히 접고 다시 열 수 있게 한다.

**Architecture:** 검색 헤더는 일반 flex 흐름의 `shrink-0` 영역, 지도는 남은 공간의 `relative min-h-0 flex-1` 작업 영역이 된다. 바텀시트는 지도 작업 영역 안에서만 네 상태를 이동하고, `RestaurantsMapView`가 숨김 상태의 다시 열기 및 마커 선택 복원을 소유한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4, Vitest, Testing Library, Kakao Maps JavaScript SDK

## Global Constraints

- 검색 조건, 서버 조회, 지도 마커·클러스터링, 식당 상세 링크 동작을 변경하지 않는다.
- 상태는 정확히 `hidden`, `peek`, `half`, `full`이다.
- 초기 상태와 숨김 후 복원 상태는 `half`다.
- 접기·열기 버튼은 최소 44px 클릭 영역과 접근 가능한 이름을 가진다.
- 단순히 바텀시트의 z-index를 검색 헤더보다 높여 검색창을 덮지 않는다.
- 데스크톱 사이드 패널로 전환하지 않는다.

---

### Task 1: 네 상태 바텀시트와 명시적 접기

**Files:**
- Modify: `src/app/restaurants/BottomSheet.tsx`
- Create: `src/app/restaurants/BottomSheet.test.tsx`

**Interfaces:**
- Produces: `type SheetSnap = "hidden" | "peek" | "half" | "full"`
- Consumes: `snap`, `onSnapChange`, `header`, `children`
- Visible sheet region id: `restaurant-results-sheet`

- [ ] **Step 1: Write failing state-transition tests**

Use pointer down/up events on the element with accessible name `식당 목록 크기 조절`. Assert upward `peek → half → full`, downward `full → half → peek → hidden`, tap moves only one adjacent visible step, the `식당 목록 접기` button always requests `hidden`, and `hidden` renders no sheet.

```tsx
fireEvent.pointerDown(handle, { clientY: 100 });
fireEvent.pointerUp(handle, { clientY: 160 });
expect(onSnapChange).toHaveBeenCalledWith("hidden");

fireEvent.click(screen.getByRole("button", { name: "식당 목록 접기" }));
expect(onSnapChange).toHaveBeenCalledWith("hidden");
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm.cmd run test -- src/app/restaurants/BottomSheet.test.tsx`

Expected: FAIL because `hidden` and explicit buttons are not implemented.

- [ ] **Step 3: Implement adjacent transitions and accessibility**

Change `SNAP_ORDER` to all four states and visible height classes to `peek: "h-24"`, `half: "h-[45%]"`, `full: "h-[85%]"`. Return `null` for `hidden`. Give the sheet `id="restaurant-results-sheet"`; make the handle a real button or keyboard-operable element named `식당 목록 크기 조절`; add a separate button:

```tsx
<button
  type="button"
  onClick={() => onSnapChange("hidden")}
  aria-controls="restaurant-results-sheet"
  aria-expanded="true"
  aria-label="식당 목록 접기"
  className="min-h-11 min-w-11"
>
  접기
</button>
```

For a tap, move `peek → half`, `half → full`, and keep `full` at `full`; never wrap to `peek`.

- [ ] **Step 4: Run the focused test**

Run: `npm.cmd run test -- src/app/restaurants/BottomSheet.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the sheet state machine**

```powershell
git add src/app/restaurants/BottomSheet.tsx src/app/restaurants/BottomSheet.test.tsx
git commit -m "feat: fully collapse restaurant bottom sheet"
```

### Task 2: Hidden-state reopen and marker recovery

**Files:**
- Modify: `src/app/restaurants/RestaurantsMapView.tsx`
- Create: `src/app/restaurants/RestaurantsMapView.test.tsx`

**Interfaces:**
- Consumes: four-state `SheetSnap`
- Produces: hidden trigger `식당 목록 열기` with `aria-controls="restaurant-results-sheet"` and `aria-expanded="false"`
- Marker selection rule: `hidden` or `peek` becomes `half`; `half` and `full` remain unchanged

- [ ] **Step 1: Write failing UI-state tests**

Mock `loadKakaoMaps` with a minimal map, marker, clusterer, event-listener registry, `LatLng`, and `LatLngBounds`. Render one restaurant, click `식당 목록 접기`, assert the sheet disappears and `식당 목록 열기` appears; click it and assert the sheet returns at `half`. Invoke the captured marker click callback after hiding and assert the selected restaurant is visible and the open button disappears.

```tsx
fireEvent.click(screen.getByRole("button", { name: "식당 목록 접기" }));
const open = screen.getByRole("button", { name: "식당 목록 열기" });
expect(open).toHaveAttribute("aria-expanded", "false");
fireEvent.click(open);
expect(screen.getByRole("region", { name: "식당 목록" })).toBeInTheDocument();
```

- [ ] **Step 2: Verify the test fails**

Run: `npm.cmd run test -- src/app/restaurants/RestaurantsMapView.test.tsx`

Expected: FAIL because the hidden trigger and hidden-marker transition do not exist.

- [ ] **Step 3: Implement reopening and marker behavior**

When `sheetSnap === "hidden"`, render an absolute bottom button above mobile safe-area/navigation overlap. Set `aria-controls`, `aria-expanded="false"`, and `onClick={() => setSheetSnap("half")}`. Change marker selection to:

```ts
setSheetSnap((current) => current === "hidden" || current === "peek" ? "half" : current);
```

Apply the same rule in `handleSelectFromList`; keep pan behavior unchanged. Mark the visible sheet as `role="region" aria-label="식당 목록"`.

- [ ] **Step 4: Run map and sheet tests**

Run: `npm.cmd run test -- src/app/restaurants/RestaurantsMapView.test.tsx src/app/restaurants/BottomSheet.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit map-view behavior**

```powershell
git add src/app/restaurants/RestaurantsMapView.tsx src/app/restaurants/RestaurantsMapView.test.tsx
git commit -m "fix: restore collapsed restaurant results"
```

### Task 3: Separate search header from the map workspace

**Files:**
- Create: `src/app/restaurants/RestaurantsMapWorkspace.tsx`
- Create: `src/app/restaurants/RestaurantsMapWorkspace.test.tsx`
- Modify: `src/app/restaurants/page.tsx`

**Interfaces:**
- Produces: `RestaurantsMapWorkspace({ header, children })`
- Layout contract: outer `flex min-h-0 flex-1 flex-col overflow-hidden`; header `shrink-0`; map area `relative min-h-0 flex-1`

- [ ] **Step 1: Write a failing layout-boundary test**

Render sentinel header and map nodes. Assert the header is outside the relative map workspace and the exact flex/shrink classes are present.

```tsx
const { container } = render(
  <RestaurantsMapWorkspace header={<div>검색 영역</div>}><div>지도 영역</div></RestaurantsMapWorkspace>,
);
expect(screen.getByText("검색 영역").parentElement).toHaveClass("shrink-0");
expect(screen.getByText("지도 영역").parentElement).toHaveClass("relative", "min-h-0", "flex-1");
expect(container.querySelector(".relative")?.contains(screen.getByText("검색 영역"))).toBe(false);
```

- [ ] **Step 2: Verify missing-component failure**

Run: `npm.cmd run test -- src/app/restaurants/RestaurantsMapWorkspace.test.tsx`

Expected: FAIL because `RestaurantsMapWorkspace.tsx` does not exist.

- [ ] **Step 3: Implement the workspace and integrate the page**

Implement the presentational component:

```tsx
export function RestaurantsMapWorkspace({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative z-20 shrink-0 bg-white/95 shadow-sm backdrop-blur">{header}</div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </main>
  );
}
```

In `page.tsx`, move the existing heading/form unchanged into the `header` prop and render `RestaurantsMapView` as children. Remove the page-level absolute header and its absolute full-page overlap; do not alter any input names, defaults, or filtering code.

- [ ] **Step 4: Run layout and regression tests**

Run: `npm.cmd run test -- src/app/restaurants/RestaurantsMapWorkspace.test.tsx src/app/restaurants/RestaurantsMapView.test.tsx src/app/restaurants/BottomSheet.test.tsx`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the layout fix**

```powershell
git add src/app/restaurants/RestaurantsMapWorkspace.tsx src/app/restaurants/RestaurantsMapWorkspace.test.tsx src/app/restaurants/page.tsx
git commit -m "fix: keep restaurant sheet below search controls"
```

### Task 4: Browser and project verification

**Files:**
- No production file changes expected

**Interfaces:**
- Verifies the complete `/restaurants` interaction contract

- [ ] **Step 1: Run required verification**

Run sequentially:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Expected: every command exits with code 0.

- [ ] **Step 2: Verify desktop behavior in an authenticated browser**

Open `http://localhost:3000/restaurants` at a desktop width. Verify the collapsed and expanded filter header always remains above the map workspace; `peek`, `half`, and `full` keep their controls visible; `식당 목록 접기` hides the entire sheet; `식당 목록 열기` restores `half`; a marker selected while hidden restores `half` and pans the map.

- [ ] **Step 3: Verify mobile regression**

At a mobile width, repeat drag, explicit collapse, reopen, list selection, detail link, and marker selection. Confirm the reopen button does not sit behind the fixed mobile navigation.

