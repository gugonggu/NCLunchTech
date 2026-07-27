

# Standalone Roulette Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a standalone roulette route with an in-place active-restaurant search panel while keeping recommendations on their own route.

**Architecture:** Extract a reusable restaurant-search boundary from the appointment search implementation and expose it through a small JSON route. Render `/roulette` as a server page that supplies initial active candidates; keep roulette editing and search-result selection in client components so search requests never reset the wheel. Update the shared navigation to make roulette the sixth destination.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase RPC, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Search only `is_active = true` restaurants; do not create or modify restaurant data.
- Preserve a minimum of one roulette candidate and a maximum of 64 total slots.
- Search filters are name, category, radius, open-now, sort, and page; names are normalized to 50 characters.
- Do not add a database migration or an external dependency.
- Desktop search is beside the wheel; mobile search appears below it.

---

## File structure

- `src/lib/roulette/restaurant-search.ts`: roulette-safe search types and query wrapper using the existing RPC.
- `src/app/api/roulette/restaurants/route.ts`: validates query parameters and returns a JSON search state.
- `src/app/roulette/page.tsx`: standalone server route supplying initial candidates to the roulette workspace.
- `src/app/roulette/RouletteWorkspace.tsx`: owns candidate state, fetches results, and composes wheel plus search panel.
- `src/app/roulette/RouletteRestaurantSearch.tsx`: renders filters, results, pagination, and add buttons.
- `src/app/recommend/RouletteResult.tsx`: receives controlled candidates and handles roulette editing/spinning.
- `src/app/recommend/page.tsx`: removes the `roulette=on` mode and obsolete entry link.
- `src/components/layout/AppNavigation.tsx`, `src/components/icons/AppIcon.tsx`: add the sixth roulette navigation item.

### Task 1: Add the roulette restaurant-search boundary

**Files:**
- Create: `src/lib/roulette/restaurant-search.ts`
- Test: `src/lib/roulette/restaurant-search.test.ts`

**Interfaces:**
- Produces `normalizeRouletteRestaurantSearch(raw): NormalizedRouletteRestaurantSearch`.
- Produces `searchRouletteRestaurants(raw): Promise<RouletteRestaurantSearchState>`.
- Produces `RouletteRestaurantSearchItem` with `id`, `name`, `category`, `address`, `distanceM`, and `isOpenNow`.

- [ ] **Step 1: Write the failing test**

```ts
it("normalizes invalid roulette search filters", () => {
  expect(normalizeRouletteRestaurantSearch({ q: "x".repeat(60), radius: "1", openNow: "true" }))
    .toMatchObject({ q: "x".repeat(50), radius: DEFAULT_RADIUS_M, openNow: true, page: 1 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/lib/roulette/restaurant-search.test.ts`
Expected: FAIL because the roulette search module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function searchRouletteRestaurants(raw: RouletteRestaurantSearchParams) {
  const filters = normalizeRouletteRestaurantSearch(raw);
  return searchAppointmentRestaurants(filters);
}
```

Map the appointment search state to roulette-specific exported types without altering the appointment consumer.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/lib/roulette/restaurant-search.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roulette/restaurant-search.ts src/lib/roulette/restaurant-search.test.ts
git commit -m "feat: add roulette restaurant search"
```

### Task 2: Expose search through a JSON route

**Files:**
- Create: `src/app/api/roulette/restaurants/route.ts`
- Test: `src/app/api/roulette/restaurants/route.test.ts`

**Interfaces:**
- Consumes `searchRouletteRestaurants(raw)`.
- Produces `GET /api/roulette/restaurants?${URLSearchParams}` with status 200 and a `RouletteRestaurantSearchState` JSON body.

- [ ] **Step 1: Write the failing test**

```ts
it("passes URL query filters to the roulette search", async () => {
  const response = await GET(new Request("http://localhost/api/roulette/restaurants?q=??媛?openNow=on"));
  expect(await response.json()).toMatchObject({ status: "ready", filters: { q: "??媛?, openNow: true } });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/app/api/roulette/restaurants/route.test.ts`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return Response.json(await searchRouletteRestaurants(params));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/app/api/roulette/restaurants/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/roulette/restaurants/route.ts src/app/api/roulette/restaurants/route.test.ts
git commit -m "feat: expose roulette restaurant search"
```

### Task 3: Make the roulette route standalone

**Files:**
- Modify: `src/app/roulette/page.tsx`
- Create: `src/app/roulette/page.test.tsx`
- Modify: `src/app/recommend/page.tsx`
- Modify: `src/app/recommend/page.test.tsx`

**Interfaces:**
- Consumes active restaurant rows and renders `<RouletteWorkspace initialCandidates={...} />`.
- Removes `roulette` from recommendation search params and removes `<RouletteResult />` from `/recommend`.

- [ ] **Step 1: Write the failing page tests**

```tsx
it("renders the standalone roulette workspace instead of redirecting", async () => {
  render(await RoulettePage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByLabelText("?癒?뼎 ?룰퀡??)).toBeVisible();
});

it("does not render roulette mode in recommendations", async () => {
  render(await RecommendPage({ searchParams: Promise.resolve({ roulette: "on" }) }));
  expect(screen.queryByLabelText("?癒?뼎 ?룰퀡??)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- src/app/roulette/page.test.tsx src/app/recommend/page.test.tsx`
Expected: FAIL because `/roulette` redirects and `/recommend` still branches into roulette mode.

- [ ] **Step 3: Write minimal implementation**

```tsx
export default async function RoulettePage() {
  const candidates = await getActiveRouletteCandidates();
  return <main className="flex w-full flex-1 flex-col gap-6"><RouletteWorkspace initialCandidates={candidates} /></main>;
}
```

Select active restaurant ID and name only for initial candidates. Keep `/recommend`'s existing recommendation query and remove only its roulette-specific mode and link.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- src/app/roulette/page.test.tsx src/app/recommend/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/roulette/page.tsx src/app/roulette/page.test.tsx src/app/recommend/page.tsx src/app/recommend/page.test.tsx
git commit -m "feat: separate roulette from recommendations"
```

### Task 4: Preserve roulette state while searching and adding restaurants

**Files:**
- Create: `src/app/roulette/RouletteWorkspace.tsx`
- Create: `src/app/roulette/RouletteRestaurantSearch.tsx`
- Create: `src/app/roulette/RouletteWorkspace.test.tsx`
- Modify: `src/app/recommend/RouletteResult.tsx`
- Modify: `src/app/recommend/RouletteResult.weighted.test.tsx`

**Interfaces:**
- `RouletteWorkspace({ initialCandidates: RouletteCandidate[] })` stores candidates locally and exposes `onAddCandidate(candidate)`.
- `RouletteRestaurantSearch({ selectedIds, canAdd, onAddCandidate })` fetches the JSON route and renders filter controls and pages.
- `RouletteResult({ candidates, initialWinnerId, decideAction, onCandidatesChange })` keeps weights for retained candidates and reports edits to the workspace.

- [ ] **Step 1: Write the failing tests**

```tsx
it("adds a searched active restaurant without clearing existing roulette entries", async () => {
  render(<RouletteWorkspace initialCandidates={[{ id: "one", name: "疫꿸퀣????몃뼣" }]} />);
  await userEvent.click(await screen.findByRole("button", { name: "野꺜????몃뼣 ?곕떽?" }));
  expect(screen.getByText("疫꿸퀣????몃뼣")).toBeVisible();
  expect(screen.getByText("野꺜????몃뼣")).toBeVisible();
});

it("disables add when total roulette slots are 64", async () => {
  render(<RouletteWorkspace initialCandidates={sixtyFourCandidates} />);
  expect(await screen.findByRole("button", { name: "野꺜????몃뼣 ?곕떽?" })).toBeDisabled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- src/app/roulette/RouletteWorkspace.test.tsx src/app/recommend/RouletteResult.weighted.test.tsx`
Expected: FAIL because the workspace and search panel do not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
const canAdd = getTotalSlots(entries) < MAX_ROULETTE_SLOTS;
function onAddCandidate(candidate: RouletteCandidate) {
  setCandidates((current) => current.some((item) => item.id === candidate.id) ? current : [...current, candidate]);
}
```

Use `useEffect` plus `fetch` with an `AbortController` for the search query. Omit already selected IDs from the add action, preserve the current wheel when filters change, and lay out the workspace with `lg:grid-cols-[minmax(0,1fr)_22rem]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- src/app/roulette/RouletteWorkspace.test.tsx src/app/recommend/RouletteResult.weighted.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/roulette/RouletteWorkspace.tsx src/app/roulette/RouletteRestaurantSearch.tsx src/app/roulette/RouletteWorkspace.test.tsx src/app/recommend/RouletteResult.tsx src/app/recommend/RouletteResult.weighted.test.tsx
git commit -m "feat: add roulette restaurant search panel"
```

### Task 5: Add roulette as the sixth navigation destination

**Files:**
- Modify: `src/components/icons/AppIcon.tsx`
- Modify: `src/components/layout/AppNavigation.tsx`
- Modify: `src/components/layout/layout.test.tsx`

**Interfaces:**
- Produces `AppIconName` member `roulette`.
- Produces six `NAV_ITEMS`, including `{ href: "/roulette", label: "?룰퀡??, icon: "roulette" }`.

- [ ] **Step 1: Write the failing navigation test**

```tsx
it("shows six navigation destinations including roulette", () => {
  render(<AppNavigation />);
  expect(screen.getByRole("link", { name: "?룰퀡?? })).toHaveAttribute("href", "/roulette");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/components/layout/layout.test.tsx`
Expected: FAIL because roulette is absent from navigation.

- [ ] **Step 3: Write minimal implementation**

```tsx
{ href: "/roulette", label: "?룰퀡??, icon: "roulette" }
```

Add a simple wheel SVG path and change the mobile grid class from `grid-cols-5` to `grid-cols-6`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/components/layout/layout.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/icons/AppIcon.tsx src/components/layout/AppNavigation.tsx src/components/layout/layout.test.tsx
git commit -m "feat: add roulette navigation"
```

### Task 6: Verify the integrated feature

**Files:**
- Modify only if a verification failure requires a minimal fix.

- [ ] **Step 1: Run focused tests**

Run: `npm.cmd test -- src/lib/roulette/restaurant-search.test.ts src/app/api/roulette/restaurants/route.test.ts src/app/roulette/page.test.tsx src/app/roulette/RouletteWorkspace.test.tsx src/components/layout/layout.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run project validation**

Run: `npm.cmd run lint; npm.cmd run typecheck; npm.cmd test; npm.cmd run build`
Expected: each command exits with status 0.

- [ ] **Step 3: Review final scope**

Confirm no migration, secrets, or unrelated files are included and that `git diff --check` has no whitespace errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: separate roulette and add restaurant search"
```

## Self-review

- Spec coverage: Tasks 1-2 create the search contract; Task 3 separates routes; Task 4 delivers desktop/mobile search and preserves wheel state; Task 5 supplies six navigation areas; Task 6 verifies all constraints.
- Placeholder scan: no unresolved implementation or validation placeholders remain.
- Type consistency: `RouletteCandidate` is the shared candidate input and `RouletteRestaurantSearchState` is the JSON search response across Tasks 1-4.





