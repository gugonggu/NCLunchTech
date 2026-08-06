# Friday Pizza Pickup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class pickup meal type and a Friday-only Papajohns Centum City promotion that starts a public pickup appointment.

**Architecture:** `pickup` becomes an appointment-domain value protected by the database constraint and server validation. The stateless promotion looks up the one active restaurant, renders only on Friday in Asia/Seoul, and links to the existing appointment form with a named UI-preset token.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind CSS 4, Supabase PostgreSQL, Vitest, Testing Library.

## Global Constraints

- Process weekday decisions in Asia/Seoul.
- Use only server-side Supabase access.
- Preserve existing `dine_in` and `delivery` data and behavior.
- Do not add ordering, payment, generic promotion administration, or dependencies.
- Target only an active restaurant named exactly `파파존스 센텀시티점`.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before completion.

---

## File Structure

- Create `supabase/migrations/0065_appointment_pickup_meal_type.sql`: permit `pickup` in `appointments.meal_type`.
- Modify `src/lib/appointments/validation.ts` and `.test.ts`: add the type, parser, and display label.
- Create `src/lib/friday-pizza-party.ts` and `.test.ts`: own the exact store name, promo token, default memo, and token parser.
- Modify `src/app/appointments/new/page.tsx`, `PublicRecruitmentFields.tsx`, and `page.test.tsx`: apply safe preset defaults.
- Modify `src/app/appointments/[id]/page.tsx`: render its meal type through the shared label helper.
- Create `src/lib/restaurants/friday-pizza-party.ts` and `.test.ts`: exact active-store lookup plus Seoul-Friday test.
- Create `src/components/lunch/FridayPizzaPartyCard.tsx` and `.test.tsx`: isolated card UI.
- Modify `src/app/page.tsx` and `.test.tsx`: fetch and conditionally render the card.

### Task 1: Persist and validate pickup

**Files:**
- Create: `supabase/migrations/0065_appointment_pickup_meal_type.sql`
- Modify: `src/lib/appointments/validation.ts`
- Test: `src/lib/appointments/validation.test.ts`

**Interfaces:**
- Produces `AppointmentMealType = "dine_in" | "delivery" | "pickup"`.
- Produces `getAppointmentMealTypeLabel(mealType: AppointmentMealType): "방문" | "배달" | "포장"`.
- `parseAppointmentMealType(value: unknown)` returns `pickup` only for that exact value.

- [ ] **Step 1: Write failing tests**

```ts
expect(parseAppointmentMealType("pickup")).toBe("pickup");
expect(parseAppointmentMealType("takeout")).toBeNull();
expect(getAppointmentMealTypeLabel("pickup")).toBe("포장");
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- src/lib/appointments/validation.test.ts`

Expected: FAIL because `pickup` and the label helper do not exist.

- [ ] **Step 3: Implement the migration and minimal domain code**

```sql
alter table appointments drop constraint appointments_meal_type_check;
alter table appointments
  add constraint appointments_meal_type_check
  check (meal_type in ('dine_in', 'delivery', 'pickup'));
```

```ts
export type AppointmentMealType = "dine_in" | "delivery" | "pickup";

export function parseAppointmentMealType(value: unknown): AppointmentMealType | null {
  return value === "dine_in" || value === "delivery" || value === "pickup" ? value : null;
}

export function getAppointmentMealTypeLabel(mealType: AppointmentMealType) {
  return mealType === "dine_in" ? "방문" : mealType === "delivery" ? "배달" : "포장";
}
```

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/lib/appointments/validation.test.ts`

Expected: PASS.

```bash
git add supabase/migrations/0065_appointment_pickup_meal_type.sql src/lib/appointments/validation.ts src/lib/appointments/validation.test.ts
git commit -m "feat: support pickup appointments"
```

### Task 2: Add the safe pizza-party preset

**Files:**
- Create: `src/lib/friday-pizza-party.ts`
- Test: `src/lib/friday-pizza-party.test.ts`
- Modify: `src/app/appointments/new/page.tsx`
- Modify: `src/app/appointments/new/PublicRecruitmentFields.tsx`
- Test: `src/app/appointments/new/page.test.tsx`
- Modify: `src/app/appointments/[id]/page.tsx`

**Interfaces:**
- Produces `FRIDAY_PIZZA_PARTY_PROMO = "friday-pizza-party"`.
- Produces the exact default memo `1+1 이벤트 · 대표 주문 후 2~3명이 함께 픽업, 함께 식사해요.`.
- Produces `isFridayPizzaPartyPromo(value: unknown): boolean`.
- `PublicRecruitmentFields` receives `defaultIsPublic?: boolean` and initializes its `useState` from it.

- [ ] **Step 1: Write failing preset and page tests**

```ts
expect(isFridayPizzaPartyPromo("friday-pizza-party")).toBe(true);
expect(isFridayPizzaPartyPromo("pickup")).toBe(false);

render(await NewAppointmentPage({
  searchParams: Promise.resolve({ restaurantId: "r1", promo: "friday-pizza-party" }),
}));
expect(screen.getByRole("radio", { name: "포장" })).toBeChecked();
expect(screen.getByRole("checkbox", { name: "공개 모집" })).toBeChecked();
expect(screen.getByDisplayValue("1+1 이벤트 · 대표 주문 후 2~3명이 함께 픽업, 함께 식사해요.")).toBeInTheDocument();
```

Also assert that an ordinary selected-restaurant form remains `방문` and private.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/lib/friday-pizza-party.test.ts src/app/appointments/new/page.test.tsx`

Expected: FAIL because there is no promo parsing or pickup/public/memo defaults.

- [ ] **Step 3: Implement the preset**

```ts
export const FRIDAY_PIZZA_PARTY_RESTAURANT_NAME = "파파존스 센텀시티점";
export const FRIDAY_PIZZA_PARTY_PROMO = "friday-pizza-party";
export const FRIDAY_PIZZA_PARTY_DEFAULT_MEMO =
  "1+1 이벤트 · 대표 주문 후 2~3명이 함께 픽업, 함께 식사해요.";
export const isFridayPizzaPartyPromo = (value: unknown) => value === FRIDAY_PIZZA_PARTY_PROMO;
```

Read `promo?: string` from the selected appointment page. For only the exact token, check the `pickup` radio by default, pass `defaultIsPublic`, and fill the memo. Add the third `pickup` radio alongside existing 방문/배달 controls. Preserve `promo` in the unauthenticated selected-restaurant `returnTo` URL. Replace the detail-page delivery/visit ternary with `getAppointmentMealTypeLabel(appointment.mealType)`.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/lib/friday-pizza-party.test.ts src/app/appointments/new/page.test.tsx && npm run typecheck`

Expected: PASS.

```bash
git add src/lib/friday-pizza-party.ts src/lib/friday-pizza-party.test.ts src/app/appointments/new/page.tsx src/app/appointments/new/PublicRecruitmentFields.tsx src/app/appointments/new/page.test.tsx src/app/appointments/[id]/page.tsx
git commit -m "feat: preset friday pizza pickup appointments"
```

### Task 3: Render the Friday card for the eligible store

**Files:**
- Create: `src/lib/restaurants/friday-pizza-party.ts`
- Test: `src/lib/restaurants/friday-pizza-party.test.ts`
- Create: `src/components/lunch/FridayPizzaPartyCard.tsx`
- Test: `src/components/lunch/FridayPizzaPartyCard.test.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Produces `isFridayInSeoul(now: Date): boolean` using `Intl.DateTimeFormat` with `timeZone: "Asia/Seoul"` and weekday `"short"`.
- Produces `getFridayPizzaPartyRestaurant(): Promise<{ id: string } | null>`.
- Produces `FridayPizzaPartyCard({ restaurantId: string })`, linking to `/appointments/new?restaurantId=<id>&promo=friday-pizza-party`.

- [ ] **Step 1: Write failing lookup, card, and home tests**

```ts
expect(isFridayInSeoul(new Date("2026-08-07T03:00:00.000Z"))).toBe(true);
expect(isFridayInSeoul(new Date("2026-08-06T03:00:00.000Z"))).toBe(false);

render(<FridayPizzaPartyCard restaurantId="pizza-1" />);
expect(screen.getByRole("link", { name: "포장 약속 만들기" })).toHaveAttribute(
  "href",
  "/appointments/new?restaurantId=pizza-1&promo=friday-pizza-party",
);
```

Mock a returned `{ id: "pizza-1" }` on Friday in the home test and expect the card. Repeat for Thursday and for `null`, expecting no card.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/lib/restaurants/friday-pizza-party.test.ts src/components/lunch/FridayPizzaPartyCard.test.tsx src/app/page.test.tsx`

Expected: FAIL because the lookup, card, and weekday conditional do not exist.

- [ ] **Step 3: Implement lookup, card, and home integration**

```ts
export async function getFridayPizzaPartyRestaurant(): Promise<{ id: string } | null> {
  const { data } = await createServiceRoleClient()
    .from("restaurants")
    .select("id")
    .eq("name", FRIDAY_PIZZA_PARTY_RESTAURANT_NAME)
    .eq("is_active", true)
    .maybeSingle();
  return data ? { id: data.id } : null;
}
```

Fetch that query in the existing logged-in home `Promise.all`. Render the card directly after the announcement only when both the lookup result exists and `isFridayInSeoul(now)` is true. The card must show: `이번 주 금요일`, `🍕 금요일 피자 파티`, `파파존스 센텀시티점 1+1 · 같이 주문하고 포장해요`, `대표 주문 후 함께 픽업, 함께 식사`, and `포장 약속 만들기`.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/lib/restaurants/friday-pizza-party.test.ts src/components/lunch/FridayPizzaPartyCard.test.tsx src/app/page.test.tsx`

Expected: PASS.

```bash
git add src/lib/restaurants/friday-pizza-party.ts src/lib/restaurants/friday-pizza-party.test.ts src/components/lunch/FridayPizzaPartyCard.tsx src/components/lunch/FridayPizzaPartyCard.test.tsx src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: show friday pizza pickup card"
```

### Task 4: Verify the whole project

**Files:**
- Modify only files needed to correct a failure directly caused by Tasks 1–3.

- [ ] **Step 1: Run static checks**

Run: `npm run lint && npm run typecheck`

Expected: both exit 0.

- [ ] **Step 2: Run the test suite**

Run: `npm test`

Expected: all Vitest tests pass.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: build exits 0.

- [ ] **Step 4: Review the final repository state**

Run: `git diff --check HEAD~3..HEAD && git status --short`

Expected: no whitespace errors and no unrelated changes.

## Self-review

- Spec coverage: Task 1 covers storage and validation; Task 2 covers form defaults, public recruitment, and detail labels; Task 3 covers Friday-only exact-store card visibility; Task 4 covers all mandatory validation commands.
- Placeholder scan: the plan has no unresolved placeholders or unspecified test tasks.
- Type consistency: `pickup` is the only new persisted value. The `promo` query is an exact token used only for UI defaults and is never trusted as a database authorization signal.
