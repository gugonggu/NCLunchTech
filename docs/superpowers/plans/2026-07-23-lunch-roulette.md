# 점심 룰렛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 추천 조건을 유지한 별도 점심 룰렛 화면에서 가중 무작위 식당을 고르고 기존 결정·약속·투표 흐름으로 연결한다.

**Architecture:** 추천 후보 구성 코드를 서버 전용 `getRecommendContext`로 추출해 `/recommend`와 `/roulette`가 동일한 조건과 필터를 사용한다. 서버가 당첨 후보를 결정하고 클라이언트는 회전 애니메이션과 결과 동작만 담당한다.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Tailwind CSS, Vitest, Supabase server client.

## Global Constraints

- 기본 추천과 기존 동점 룰렛은 변경하지 않는다.
- DB 마이그레이션, 외부 API, 결과 영속화는 추가하지 않는다.
- 조건은 `recommendConditionsSchema`로 서버 검증하고, 후보는 기존 `filterCandidates`, `pickRecommendation`, 추천 제외 쿠키를 사용한다.
- 약속·투표·방문 결정은 기존 서버 경로와 인증 규칙을 재사용한다.
- 완료 전 `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`를 실행한다.

---

### Task 1: 추천 URL과 후보 context 공통화

**Files:**

- Create: `src/lib/recommend/urls.ts`, `src/lib/recommend/urls.test.ts`, `src/lib/recommend/context.ts`
- Modify: `src/app/recommend/page.tsx`, `src/app/recommend/actions.ts`, `src/app/recommend/page.test.tsx`

**Interfaces:** `buildRecommendUrl(conditions)`, `buildRouletteUrl(conditions)`, `getRecommendContext(rawParams)`을 만든다. Context는 검증된 조건, 반경, 회사 좌표, 후보, 최근 방문, 쿠키 제외 목록을 반환한다.

- [ ] **Step 1: 실패하는 URL 테스트 작성**

```ts
it("preserves recommendation conditions in the roulette URL", () => {
  expect(buildRouletteUrl({ category: "한식", radius: 600, maxPriceWon: 10_000, excludeRecentVisits: true }))
    .toBe("/roulette?category=%ED%95%9C%EC%8B%9D&radius=600&maxPrice=10000&excludeRecent=on");
});
```

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/lib/recommend/urls.test.ts`  
Expected: `urls.ts`가 없어 실패.

- [ ] **Step 3: 최소 구현**

```ts
export function buildRouletteUrl(conditions: RecommendConditionsInput) {
  const query = buildRecommendQuery(conditions);
  return query ? `/roulette?${query}` : "/roulette";
}
```

`RecommendPage`의 설정·식당·상태·리뷰·방문 데이터 조회와 `filterCandidates` 호출을 `getRecommendContext`로 옮긴다. 페이지의 기존 빈 결과 문구는 context의 회사 좌표와 후보 수를 이용해 유지한다. 추천 URL serializer는 shared helper로 교체하고, 추천 결과 옆에 조건을 보존하는 `룰렛 모드` 링크를 추가한다.

- [ ] **Step 4: GREEN 확인**

```ts
expect(screen.getByRole("link", { name: "룰렛 모드" }))
  .toHaveAttribute("href", "/roulette?category=%ED%95%9C%EC%8B%9D&radius=600");
```

Run: `npm.cmd run test -- src/lib/recommend/urls.test.ts src/app/recommend/page.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/recommend src/app/recommend && git commit -m "refactor: share recommendation context"`

### Task 2: 룰렛 화면과 재추첨

**Files:**

- Create: `src/app/roulette/page.tsx`, `src/app/roulette/RouletteResult.tsx`, `src/app/roulette/RouletteResult.test.tsx`, `src/app/roulette/actions.ts`

**Interfaces:** `/roulette`는 `getRecommendContext`와 `pickRecommendation` 결과를 사용한다. `RouletteResult`는 `{ candidates, winner, conditions }`를 받아 화면을 만들고 `rerollRoulette`은 현재 식당을 제외한 같은 조건의 `/roulette`로 리다이렉트한다.

- [ ] **Step 1: 실패하는 룰렛 UI 테스트 작성**

```tsx
it("reveals the server-selected restaurant and all result actions", async () => {
  render(<RouletteResult candidates={[{ id: "a", name: "한식당" }, { id: "b", name: "중식당" }]} winner={{ id: "b", name: "중식당" }} conditions={{}} />);
  await userEvent.click(screen.getByRole("button", { name: "룰렛 돌리기" }));
  await vi.advanceTimersByTimeAsync(1200);
  expect(screen.getByText("중식당")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "같이 먹기" })).toHaveAttribute("href", "/appointments/new?restaurantId=b");
  expect(screen.getByRole("link", { name: "투표로 넘기기" })).toHaveAttribute("href", "/polls/new?type=restaurant&selectedRestaurantId=b");
});
```

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/app/roulette/RouletteResult.test.tsx`  
Expected: component does not exist.

- [ ] **Step 3: 최소 구현**

`page.tsx`에서 서버가 `pickRecommendation(filtered, { excludeIds, recentVisitDays, conditions })`로 당첨을 뽑는다. UI는 1.2초 동안 후보 이름을 순환 표시하고 서버 당첨 결과를 표시한다. 결과에는 `rerollRoulette` form, `decideRestaurant` form, `/appointments/new?restaurantId=<id>`, `/polls/new?type=restaurant&selectedRestaurantId=<id>` 링크를 둔다.

```ts
export async function rerollRoulette(restaurantId: string, rawConditions: RecommendConditionsInput) {
  await requireEmployee();
  const parsed = recommendConditionsSchema.safeParse(rawConditions);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "조건 값이 올바르지 않습니다.");
  if (UUID_PATTERN.test(restaurantId)) await setExclusionList(addExclusion(await getExclusionList(), restaurantId));
  redirect(buildRouletteUrl(parsed.data));
}
```

- [ ] **Step 4: GREEN 확인**

Run: `npm.cmd run test -- src/app/roulette/RouletteResult.test.tsx src/lib/recommend/engine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/roulette && git commit -m "feat: add lunch roulette"`

### Task 3: 투표 후보 사전 선택

**Files:**

- Modify: `src/app/polls/new/page.tsx`
- Create: `src/app/polls/new/page.test.tsx`

**Interfaces:** `NewPollSearchParams`에 `selectedRestaurantId?: string`을 추가한다. 식당 투표에서 유효하고 활성화된 해당 후보만 기본 체크하며 생성 액션의 서버 검증은 변경하지 않는다.

- [ ] **Step 1: 실패하는 사전 선택 테스트 작성**

```tsx
it("preselects the valid roulette restaurant", async () => {
  render(await NewPollPage({ searchParams: Promise.resolve({ type: "restaurant", selectedRestaurantId: "r-2" }) }));
  expect(screen.getByRole("checkbox", { name: /중식당/ })).toBeChecked();
});
```

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/app/polls/new/page.test.tsx`  
Expected: selected restaurant is not checked.

- [ ] **Step 3: 최소 구현**

`selectedRestaurantId`가 UUID이고 활성 식당 목록에 있는 경우에만 `defaultChecked={selectedRestaurantId === r.id}`를 적용한다. `createRestaurantPoll`는 제출받은 식당 ID를 계속 다시 검증한다.

- [ ] **Step 4: GREEN 확인 및 Commit**

Run: `npm.cmd run test -- src/app/polls/new/page.test.tsx`  
Expected: PASS.  
Run: `git add src/app/polls/new/page.tsx src/app/polls/new/page.test.tsx && git commit -m "feat: preselect roulette restaurant for poll"`

### Task 4: 전체 검증

**Files:** Verify only.

- [ ] **Step 1: lint** — Run: `npm.cmd run lint` — Expected: exit 0.
- [ ] **Step 2: typecheck** — Run: `npm.cmd run typecheck` — Expected: exit 0.
- [ ] **Step 3: unit tests** — Run: `npm.cmd run test` — Expected: all tests pass.
- [ ] **Step 4: production build** — Run: `npm.cmd run build` — Expected: exit 0.
- [ ] **Step 5: scope review** — Run: `git diff HEAD~3..HEAD -- src/app/roulette src/app/recommend src/lib/recommend src/app/polls/new` — Expected: only approved roulette, shared recommendation, and poll preselection changes.
