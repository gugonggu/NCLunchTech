# Recommendation and Roulette Excluded Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let employees select one or more restaurant categories to exclude from both the daily recommendation and roulette results, including subsequent rerolls.

**Architecture:** Store the selected categories in the existing recommendation-condition object. Parse repeated `excludeCategory` query parameters, validate every value against `RESTAURANT_CATEGORIES`, serialize the same repeated parameter for recommendation and roulette URLs, then remove candidates whose category occurs in that array. The existing filter form submits one checkbox per category and retains the selection through server-rendered defaults.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Zod, Vitest, Testing Library.

## Constraints

- Keep the existing single `category` include filter unchanged; exclusion is additive and wins when both filters name the same category.
- Do not add persistent per-user settings, database schema changes, or new restaurant categories.
- Malformed or unknown query values must use the existing invalid-condition UI; duplicate category values must result in one logical exclusion.
- Recommendation, roulette navigation, and both reroll server actions must preserve the exclusions.
- Before reporting completion, run `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test`, and `npm.cmd run build`.

### Task 1: Extend condition validation and URL round-trip

**Files:**

- Modify: `src/lib/recommend/validation.ts`
- Modify: `src/lib/recommend/urls.ts`
- Modify: `src/lib/recommend/validation.test.ts`
- Modify: `src/lib/recommend/urls.test.ts`

- [ ] **Step 1: Add failing validation tests.** Cover repeated raw `excludeCategory` values being normalized, duplicates being removed, valid Korean category values being accepted, and an unknown category being rejected.

- [ ] **Step 2: Run the focused RED test.**

Run: `npm.cmd run test -- src/lib/recommend/validation.test.ts`

Expected: failing tests for the new input field.

- [ ] **Step 3: Implement normalized, validated exclusions.** Add `excludedCategories` to the input/domain types. Let raw params accept `string | string[]`; clean empty entries, deduplicate while retaining submitted order, and use `z.array(z.enum(RESTAURANT_CATEGORIES)).max(RESTAURANT_CATEGORIES.length).optional()` for server-action input safety.

- [ ] **Step 4: Add failing URL serialization tests.** Assert `buildRecommendUrl` and `buildRouletteUrl` emit an `excludeCategory` parameter for each selected category alongside existing conditions.

- [ ] **Step 5: Implement shared query serialization.** Serialize every validated excluded category with `params.append("excludeCategory", category)` so URL encoding and order are preserved. Use this shared helper everywhere rather than maintaining a second action-local serializer.

- [ ] **Step 6: Run focused GREEN tests.**

Run: `npm.cmd run test -- src/lib/recommend/validation.test.ts src/lib/recommend/urls.test.ts`

Expected: PASS.

### Task 2: Apply exclusions to recommendation candidates and server URL actions

**Files:**

- Modify: `src/lib/recommend/engine.ts`
- Modify: `src/lib/recommend/engine.test.ts`
- Modify: `src/app/recommend/actions.ts`
- Create or modify: `src/app/recommend/actions.test.ts`

- [ ] **Step 1: Add failing engine tests.** Verify a candidate from any selected excluded category is removed, unaffected categories remain, and a matching include `category` is still excluded when it also appears in `excludedCategories`.

- [ ] **Step 2: Run the focused RED test.**

Run: `npm.cmd run test -- src/lib/recommend/engine.test.ts`

Expected: new exclusion assertions fail.

- [ ] **Step 3: Implement engine filtering.** Add optional `excludedCategories` to `RecommendConditions` and reject candidates whose category is in that list before scoring/picking.

- [ ] **Step 4: Make reroll actions use the shared recommendation URL helper.** Remove the private duplicate serializer in `actions.ts`, import `buildRecommendUrl`, and rely on schema-parsed conditions for recommendation and roulette rerolls.

- [ ] **Step 5: Add and run server-action redirect tests.** Mock authentication/cookie helpers and assert recommendation and roulette rerolls redirect with all repeated excluded-category parameters preserved.

Run: `npm.cmd run test -- src/lib/recommend/engine.test.ts src/app/recommend/actions.test.ts`

Expected: PASS.

### Task 3: Add the multi-select filter UI and page query plumbing

**Files:**

- Modify: `src/app/recommend/page.tsx`
- Modify: `src/app/recommend/RecommendationFilters.tsx`
- Modify: `src/app/recommend/RecommendationFilters.navigation.test.tsx`
- Modify: `src/app/recommend/ResponsiveFilterPanel.test.tsx`

- [ ] **Step 1: Add failing form tests.** Assert the filter form exposes one checkbox per restaurant category under an exclusion label, renders supplied exclusions checked, and submits repeated `excludeCategory` fields with existing filters.

- [ ] **Step 2: Run the focused RED test.**

Run: `npm.cmd run test -- src/app/recommend/RecommendationFilters.navigation.test.tsx src/app/recommend/ResponsiveFilterPanel.test.tsx`

Expected: new category-exclusion expectations fail.

- [ ] **Step 3: Implement filter controls.** Render accessible category checkboxes in the existing exclusion-condition fieldset. Use the current responsive panel and stable `idPrefix` to avoid duplicate IDs across layouts.

- [ ] **Step 4: Wire page search params.** Declare `excludeCategory?: string | string[]`, pass it into `normalizeRecommendParams`, and pass parsed exclusions through to the existing engine call, summary, roulette link, and reroll forms.

- [ ] **Step 5: Improve empty-state specificity if needed.** When exclusions are the only cause of an empty filtered set, use the existing generic condition-relaxation message rather than treating it as a system error.

- [ ] **Step 6: Run focused GREEN tests.**

Run: `npm.cmd run test -- src/app/recommend/RecommendationFilters.navigation.test.tsx src/app/recommend/ResponsiveFilterPanel.test.tsx src/lib/recommend/engine.test.ts`

Expected: PASS.

### Task 4: Regression verification and review

**Files:** Verify only.

- [ ] **Step 1: Run formatting-safe static checks.**

Run: `npm.cmd run lint && npm.cmd run typecheck`

Expected: both exit 0.

- [ ] **Step 2: Run all unit tests.**

Run: `npm.cmd run test`

Expected: all test files pass.

- [ ] **Step 3: Run a production build.**

Run: `npm.cmd run build`

Expected: exit 0.

- [ ] **Step 4: Review changed scope.**

Run: `git diff --check && git diff -- src/lib/recommend src/app/recommend`

Expected: no whitespace errors and only category-exclusion feature changes.
