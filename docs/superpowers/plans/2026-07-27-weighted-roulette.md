# Weighted Roulette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users edit roulette candidates and their weights, then spin using those weighted odds without leaving the recommendation page.

**Architecture:** Add a small pure roulette domain module for entries, bounded weight updates, candidate deletion/addition, and weighted winner selection. Pass filtered recommendation candidates with IDs to the client `RouletteResult` component, which owns the ephemeral editable list, renders the weighted wheel, and calls the existing restaurant-decision server action for the selected winner.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Candidate weights are positive integers; a candidate cannot have zero slots.
- Total weight is the sum of candidate weights and must not exceed 64.
- At least one candidate must remain in the roulette.
- Added restaurants must come only from the server-provided, current recommendation-condition candidates.
- Editing state is page-local; do not create database tables, migrations, or stored user preferences.
- Rebuild resets every currently eligible candidate to weight 1.
- Run `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test`, and `npm.cmd run build` before completion.

---

### Task 1: Create the weighted roulette domain module

**Files:**

- Create: `src/lib/recommend/roulette.ts`
- Create: `src/lib/recommend/roulette.test.ts`

**Interfaces:**

```ts
export const MAX_ROULETTE_SLOTS = 64;
export type RouletteEntry = { id: string; name: string; weight: number };
export function getTotalSlots(entries: RouletteEntry[]): number;
export function changeEntryWeight(entries: RouletteEntry[], id: string, delta: -1 | 1): RouletteEntry[];
export function removeEntry(entries: RouletteEntry[], id: string): RouletteEntry[];
export function addEntry(entries: RouletteEntry[], entry: Omit<RouletteEntry, "weight">): RouletteEntry[];
export function pickWeightedEntry(entries: RouletteEntry[], random?: () => number): RouletteEntry | null;
```

- [ ] **Step 1: Write failing domain tests.**

```ts
it("does not lower an entry below one slot or raise the total above 64", () => {
  expect(changeEntryWeight([{ id: "a", name: "A", weight: 1 }], "a", -1)[0].weight).toBe(1);
  const full = [{ id: "a", name: "A", weight: 63 }, { id: "b", name: "B", weight: 1 }];
  expect(changeEntryWeight(full, "a", 1)).toEqual(full);
});

it("uses slots as weighted selection ranges", () => {
  const entries = [{ id: "a", name: "A", weight: 1 }, { id: "b", name: "B", weight: 3 }];
  expect(pickWeightedEntry(entries, () => 0)?.id).toBe("a");
  expect(pickWeightedEntry(entries, () => 0.75)?.id).toBe("b");
});
```

- [ ] **Step 2: Run the RED test.**

Run: `npm.cmd run test -- src/lib/recommend/roulette.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement pure bounded list operations.** Use immutable array operations. `changeEntryWeight` must return the original logical entries for unknown IDs, lower-than-one requests, and increases that exceed 64. `removeEntry` must refuse to remove the final entry. `addEntry` must reject duplicates and a full 64-slot list. `pickWeightedEntry` must map `random() * total` onto cumulative entry weights.

- [ ] **Step 4: Run the GREEN test.**

Run: `npm.cmd run test -- src/lib/recommend/roulette.test.ts`

Expected: PASS.

### Task 2: Replace the roulette result with editable weighted state

**Files:**

- Modify: `src/app/recommend/RouletteResult.tsx`
- Modify: `src/app/recommend/RouletteResult.test.tsx`

**Interfaces:**

```ts
type RouletteCandidate = { id: string; name: string };
type RouletteResultProps = {
  candidates: RouletteCandidate[];
  initialWinnerId: string;
  decideAction: (restaurantId: string) => Promise<void>;
};
```

- [ ] **Step 1: Write failing component tests.** Assert that the component renders a candidate editor, shows total slot count and percentage, changes a candidate’s weight, disallows lowering weight 1, removes a non-final candidate, restores all source candidates at weight 1 with rebuild, and uses the edited list for a subsequent spin.

```tsx
fireEvent.click(screen.getByRole("button", { name: "B 칸 늘리기" }));
expect(screen.getByText("B · 2칸 (66.7%)")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "목록 재구성하기" }));
expect(screen.getByText("B · 1칸 (50.0%)")).toBeInTheDocument();
```

- [ ] **Step 2: Run the RED test.**

Run: `npm.cmd run test -- src/app/recommend/RouletteResult.test.tsx`

Expected: FAIL because the existing component accepts string candidates and has no editor.

- [ ] **Step 3: Implement the client state and controls.** Initialize entries from `candidates`, with every weight set to 1. Use Task 1 helpers for all list mutations. Show total slots, candidate count, per-candidate probability, `-`, `+`, and delete buttons. Disable weight increase at 64 slots and deletion for the final candidate. Offer an accessible select/menu for source candidates not currently in the list. Make `현재 목록으로 다시 돌리기` clear the completed state and spin a winner from the edited entries; make `목록 재구성하기` restore all source candidates at weight 1.

- [ ] **Step 4: Render weighted wheel sectors.** Build conic-gradient stop angles from cumulative weight proportion rather than candidate index. Compute label rotation and radial offset from the same sector geometry; keep the initial winner present in the visible wheel.

- [ ] **Step 5: Run the GREEN test.**

Run: `npm.cmd run test -- src/app/recommend/RouletteResult.test.tsx src/lib/recommend/roulette.test.ts`

Expected: PASS.

### Task 3: Supply ID-bearing recommendation candidates and connect result actions

**Files:**

- Modify: `src/app/recommend/page.tsx`
- Create or modify: `src/app/recommend/page.test.tsx`

**Interfaces:** `RouletteResult` receives `filtered.map(({ id, name }) => ({ id, name }))`, `initialWinnerId={result.main.id}`, and the unbound `decideRestaurant` action so the final locally selected candidate can be decided.

- [ ] **Step 1: Write a failing page integration test.** Mock the roulette result component and assert it receives all filtered candidate IDs/names, not only the preselected server winner.

- [ ] **Step 2: Run the RED test.**

Run: `npm.cmd run test -- src/app/recommend/page.test.tsx`

Expected: FAIL because the page currently supplies only names and a winner-bound action.

- [ ] **Step 3: Implement the prop connection.** Pass the ID-bearing candidate list and initial winner ID. Remove the obsolete server `rerollRoulette` prop/import only if it becomes unused; preserve current recommendation behavior outside roulette mode.

- [ ] **Step 4: Run focused GREEN tests.**

Run: `npm.cmd run test -- src/app/recommend/page.test.tsx src/app/recommend/RouletteResult.test.tsx`

Expected: PASS.

### Task 4: Full regression verification

**Files:** Verify only.

- [ ] **Step 1: Run static checks.**

Run: `npm.cmd run lint && npm.cmd run typecheck`

Expected: exit 0.

- [ ] **Step 2: Run all tests.**

Run: `npm.cmd run test`

Expected: all tests pass.

- [ ] **Step 3: Build production output.**

Run: `npm.cmd run build`

Expected: exit 0.

- [ ] **Step 4: Review scope.**

Run: `git diff --check && git diff -- src/lib/recommend/roulette.ts src/app/recommend/RouletteResult.tsx src/app/recommend/page.tsx`

Expected: no whitespace errors and only weighted-roulette changes.
