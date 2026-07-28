# 남은 1차 필수 업적(정보 기여 2건 + 숨겨진 업적 2건) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이 계획을 완료하면 `docs/앤시점심기술 미니게임 및 업적 시스템 개발 명세` 17.1절의 "1차 필수 업적" 27개가 전부 구현된다(현재 23개 완료, 남은 4개: 메뉴 수집가 I, 정보 수정 요원, 월요일부터 든든하게, 선택의 늪).

**Architecture:** 업적 엔진은 이미 구축되어 있다(`src/lib/achievements/{events,engine,definitions,recompute}.ts`). 새 업적마다 (1) `EVENT_ACHIEVEMENT_CODES`에 이벤트→코드 매핑을 추가하고, (2) 원본 기능(메뉴 등록/가격·영업시간 수정/먹은 메뉴 기록/추천 다시 받기)이 성공한 직후 `recordAchievementEvent(...)`를 호출하고, (3) 마이그레이션으로 `achievements` 테이블에 시드하면 끝난다. 새 테이블이나 새 엔진 로직은 필요 없다(모두 기존 "증가형" 또는 "1회성 조건 충족형" 패턴으로 처리 가능).

**Tech Stack:** Next.js App Router Server Actions, Supabase(PostgreSQL, service-role 클라이언트), TypeScript, Zod, Vitest.

## Global Constraints

- 업적 판정은 항상 서버에서만 처리한다. 클라이언트가 달성 여부·진행도·포인트를 직접 전달하지 않는다.
- `recordAchievementEvent`는 `event_key` unique 제약으로 멱등이다 — 이미 처리된 요청이 재전송돼도 진행도가 두 번 증가하지 않는다(자세한 내용은 `src/lib/achievements/events.ts` 참고).
- 리뷰/정보 수정이 "내용 변경 없이 재제출"된 경우는 업적 이벤트를 발생시키지 않는다(기존 리뷰 수정과 동일한 원칙).
- 숨겨진 업적(`is_hidden = true`)은 달성 전까지 이름·설명·진행도를 노출하지 않는다 — 이미 `src/lib/achievements/queries.ts`의 `maskIfHidden`이 처리하므로 이 계획에서 UI를 따로 만들 필요는 없다.
- 날짜/요일 계산은 Asia/Seoul(UTC+9, 서머타임 없음) 기준으로 한다.
- DB 마이그레이션 파일은 `supabase/migrations/` 아래 다음 번호(현재 최신은 `0053_recommendation_visit.sql`이므로 `0054_...`)로 추가한다. **로컬에서 파일만 만들고, 원격 Supabase에 적용(`npx supabase db push --linked`)하기 전에 반드시 사용자에게 물어본다** — 이 프로젝트는 원격 프로덕션 Supabase에 직접 연결되어 있다(로컬 Docker 인스턴스 없음).
- 완료 후 `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`를 모두 실행하고 통과를 확인한다.

---

### Task 1: 메뉴 수집가 I (MENU_APPROVED_5)

**Files:**
- Modify: `supabase/migrations/0054_achievements_contribution.sql` (신규 생성 — Task 2와 achievements/titles seed를 함께 담는다)
- Modify: `src/lib/achievements/definitions.ts`
- Modify: `src/app/restaurants/[id]/actions.ts:38-79` (`addMenuItem`)

**Interfaces:**
- Consumes: `recordAchievementEvent(params: { employeeId: string; eventType: AchievementEventType; eventKey: string; referenceType?: string; referenceId?: string }): Promise<EarnedAchievementResult[]>` (이미 존재, `src/lib/achievements/events.ts`)
- Produces: 이벤트 타입 `"MENU_CREATED"` — Task 2의 매핑과 함께 `EVENT_ACHIEVEMENT_CODES`에 등록된다.

- [ ] **Step 1: 마이그레이션 파일 생성(Task 1+2 공용)**

`supabase/migrations/0054_achievements_contribution.sql`:

```sql
-- 리뷰 및 정보 기여 업적: 메뉴 수집가 I / 정보 수정 요원
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 9.5절.
-- 이 프로젝트에는 관리자 승인 단계가 없다(직원의 메뉴 등록/가격/영업시간 수정은 즉시 반영됨).
-- 따라서 "승인" 대신 "성공적으로 저장됨"을 판정 기준으로 쓴다.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('MENU_APPROVED_5', '메뉴 수집가 I', '식당의 메뉴 정보를 다섯 개 추가했습니다.', 'CONTRIBUTION', 'COMMON', 5, 10, false, 330),
  ('INFO_UPDATE_APPROVED_5', '정보 수정 요원', '오래되거나 잘못된 식당 정보를 바로잡았습니다.', 'CONTRIBUTION', 'INTERMEDIATE', 5, 20, false, 340)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'INFO_UPDATE_APPROVED_5_TITLE', '정보 수정 요원', '식당 정보 수정 5회를 완료했습니다.', a.id
from achievements a
where a.code = 'INFO_UPDATE_APPROVED_5'
on conflict (code) do nothing;
```

- [ ] **Step 2: `EVENT_ACHIEVEMENT_CODES`에 두 이벤트 추가**

`src/lib/achievements/definitions.ts`에서 마지막 `WORLDCUP_WINNER_VISIT_COMPLETED`/`RECOMMENDATION_VISIT_COMPLETED` 줄 아래에 추가:

```ts
  // 이 프로젝트에는 승인 단계가 없어 저장 성공 시점에 바로 발생한다.
  MENU_CREATED: ["MENU_APPROVED_5"],
  RESTAURANT_INFO_UPDATED: ["INFO_UPDATE_APPROVED_5"],
```

- [ ] **Step 3: `addMenuItem`에 이벤트 훅 추가**

`src/app/restaurants/[id]/actions.ts` 상단에 import 추가:

```ts
import { recordAchievementEvent } from "@/lib/achievements/events";
```

`addMenuItem` 함수의 `logChange(...)` 호출 뒤, `revalidatePath` 앞에 추가:

```ts
  await recordAchievementEvent({
    employeeId: employee.id,
    eventType: "MENU_CREATED",
    eventKey: `MENU_CREATED:${data.id}`,
    referenceType: "menu_item",
    referenceId: data.id,
  });
```

- [ ] **Step 4: typecheck로 확인(이 태스크는 순수 로직이 없어 단위 테스트 대상이 없다)**

Run: `npm run typecheck`
Expected: 통과. (기존 프로젝트 컨벤션상 DB에 바로 쓰는 서버 액션·쿼리 계층은 단위 테스트를 만들지 않는다 — `src/app/visits/actions.ts`, `src/app/reviews/new/actions.ts` 등 기존 훅도 동일하다.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0054_achievements_contribution.sql src/lib/achievements/definitions.ts "src/app/restaurants/[id]/actions.ts"
git commit -m "feat: add MENU_APPROVED_5 achievement on menu item creation"
```

---

### Task 2: 정보 수정 요원 (INFO_UPDATE_APPROVED_5)

**Files:**
- Create: `src/lib/restaurants/info-change.ts`
- Test: `src/lib/restaurants/info-change.test.ts`
- Modify: `src/app/restaurants/[id]/actions.ts` (`updateMenuPrice`, `updateRestaurantHours`)

**Interfaces:**
- Consumes: `recordAchievementEvent(...)` (Task 1과 동일)
- Produces: `hasMenuPriceChanged(before: { price: number | null }, after: { price: number | null }): boolean`, `hasRestaurantHoursChanged(before: unknown[] | null, after: unknown[] | null): boolean` — 둘 다 순수 함수.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/restaurants/info-change.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hasMenuPriceChanged, hasRestaurantHoursChanged } from "./info-change";

describe("hasMenuPriceChanged", () => {
  it("가격이 바뀌면 true다", () => {
    expect(hasMenuPriceChanged({ price: 8000 }, { price: 9000 })).toBe(true);
  });

  it("가격이 같으면(동일 값 재저장) false다", () => {
    expect(hasMenuPriceChanged({ price: 8000 }, { price: 8000 })).toBe(false);
  });

  it("null에서 값이 생기면 true다", () => {
    expect(hasMenuPriceChanged({ price: null }, { price: 8000 })).toBe(true);
  });
});

describe("hasRestaurantHoursChanged", () => {
  it("이전 데이터가 없으면(최초 등록) true다", () => {
    expect(hasRestaurantHoursChanged(null, [{ day_of_week: 0, is_closed: true }])).toBe(true);
  });

  it("내용이 완전히 같으면 false다", () => {
    const rows = [{ day_of_week: 0, is_closed: true, open_time: null, close_time: null }];
    expect(hasRestaurantHoursChanged(rows, rows)).toBe(false);
  });

  it("한 요일이라도 다르면 true다", () => {
    const before = [{ day_of_week: 0, is_closed: true, open_time: null, close_time: null }];
    const after = [{ day_of_week: 0, is_closed: false, open_time: "09:00", close_time: "20:00" }];
    expect(hasRestaurantHoursChanged(before, after)).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/restaurants/info-change.test.ts`
Expected: FAIL — `Cannot find module './info-change'`

- [ ] **Step 3: 최소 구현 작성**

`src/lib/restaurants/info-change.ts`:

```ts
/** 가격 수정이 실제로 값이 바뀐 것인지 판정한다(같은 값 재저장은 업적으로 인정하지 않음). */
export function hasMenuPriceChanged(
  before: { price: number | null } | null,
  after: { price: number | null } | null
): boolean {
  if (!before || !after) return true;
  return before.price !== after.price;
}

/** 영업시간 수정이 실제로 내용이 바뀐 것인지 판정한다(요일별 배열 전체를 비교). */
export function hasRestaurantHoursChanged(
  before: unknown[] | null,
  after: unknown[] | null
): boolean {
  if (!before || !after) return true;

  const normalize = (rows: unknown[]) =>
    JSON.stringify(
      (rows as Array<{ day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }>)
        .map((r) => ({ day: r.day_of_week, closed: r.is_closed, open: r.open_time, close: r.close_time }))
        .sort((a, b) => a.day - b.day)
    );

  return normalize(before) !== normalize(after);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/restaurants/info-change.test.ts`
Expected: PASS (6개 테스트)

- [ ] **Step 5: `updateMenuPrice`에 이벤트 훅 추가**

`src/app/restaurants/[id]/actions.ts` 상단 import에 추가:

```ts
import { recordAchievementEvent } from "@/lib/achievements/events";
import { hasMenuPriceChanged, hasRestaurantHoursChanged } from "@/lib/restaurants/info-change";
```

`updateMenuPrice`의 `logChange(...)` 호출 뒤에 추가:

```ts
  if (hasMenuPriceChanged(before, after)) {
    await recordAchievementEvent({
      employeeId: employee.id,
      eventType: "RESTAURANT_INFO_UPDATED",
      eventKey: `RESTAURANT_INFO_UPDATED:menu_item:${menuItemId}:${after.updated_at}`,
      referenceType: "menu_item",
      referenceId: menuItemId,
    });
  }
```

- [ ] **Step 6: `updateRestaurantHours`에 이벤트 훅 추가**

`updateRestaurantHours`의 `logChange(...)` 호출 뒤에 추가:

```ts
  if (hasRestaurantHoursChanged(before, after)) {
    await recordAchievementEvent({
      employeeId: employee.id,
      eventType: "RESTAURANT_INFO_UPDATED",
      eventKey: `RESTAURANT_INFO_UPDATED:restaurant_hours:${restaurantId}:${now}`,
      referenceType: "restaurant",
      referenceId: restaurantId,
    });
  }
```

- [ ] **Step 7: 전체 확인**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: 모두 통과

- [ ] **Step 8: Commit**

```bash
git add src/lib/restaurants/info-change.ts src/lib/restaurants/info-change.test.ts "src/app/restaurants/[id]/actions.ts"
git commit -m "feat: add INFO_UPDATE_APPROVED_5 achievement on real price/hours changes"
```

---

### Task 3: 숨겨진 업적 — 월요일부터 든든하게 (HIDDEN_MONDAY_SOUP)

**Files:**
- Create: `src/lib/achievements/monday-soup.ts`
- Test: `src/lib/achievements/monday-soup.test.ts`
- Create: `supabase/migrations/0055_achievements_hidden_monday_reroll.sql` (Task 3+4 공용)
- Modify: `src/lib/achievements/definitions.ts`
- Modify: `src/app/reviews/new/actions.ts` (`upsertMealRecord`)
- Modify: `src/lib/meals/queries.ts` (새 헬퍼 추가)

**Interfaces:**
- Consumes: `getCompletedMealSource(employeeId, restaurantId, source): Promise<MealSource | null>` (기존, `src/lib/meals/queries.ts`)
- Produces: `isMondaySoupMenuName(menuName: string): boolean`, `getMealSourceSeoulDate(source: MealSource): Promise<string | null>` — 후자는 새로 만드는 DB 조회 함수(순수 함수 아님, 테스트 대상 아님).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/achievements/monday-soup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isMondaySoupMenuName } from "./monday-soup";

describe("isMondaySoupMenuName", () => {
  it("국밥이 포함되면 true다", () => {
    expect(isMondaySoupMenuName("순대국밥")).toBe(true);
  });

  it("탕이 포함되면 true다", () => {
    expect(isMondaySoupMenuName("설렁탕")).toBe(true);
  });

  it("찌개가 포함되면 true다", () => {
    expect(isMondaySoupMenuName("김치찌개")).toBe(true);
  });

  it("해당 없으면 false다", () => {
    expect(isMondaySoupMenuName("돈까스")).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/achievements/monday-soup.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 최소 구현 작성**

`src/lib/achievements/monday-soup.ts`:

```ts
const SOUP_KEYWORDS = ["국밥", "탕", "찌개"];

/** 메뉴 이름에 국밥/탕/찌개 계열 키워드가 포함되는지 판정한다(숨겨진 업적 "월요일부터 든든하게"). */
export function isMondaySoupMenuName(menuName: string): boolean {
  return SOUP_KEYWORDS.some((keyword) => menuName.includes(keyword));
}

/** Asia/Seoul(UTC+9) 기준으로 YYYY-MM-DD 날짜 문자열이 월요일인지 판정한다. */
export function isSeoulMonday(seoulDateString: string): boolean {
  return new Date(`${seoulDateString}T12:00:00+09:00`).getDay() === 1;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/achievements/monday-soup.test.ts`
Expected: PASS. 아래 테스트를 같은 파일에 추가하고 다시 실행해도 통과해야 한다:

```ts
import { isSeoulMonday } from "./monday-soup";

describe("isSeoulMonday", () => {
  it("2026-07-27은 월요일이라 true다", () => {
    expect(isSeoulMonday("2026-07-27")).toBe(true);
  });

  it("2026-07-28은 화요일이라 false다", () => {
    expect(isSeoulMonday("2026-07-28")).toBe(false);
  });
});
```

- [ ] **Step 5: 방문/약속의 Seoul 날짜를 조회하는 헬퍼 추가**

`src/lib/meals/queries.ts`에 추가(파일 상단 import는 기존 그대로 유지):

```ts
import { getSeoulDateString } from "@/lib/visits/validation";

/** 먹은 메뉴 기록의 출처(개인 방문 또는 약속)가 실제로 발생한 Asia/Seoul 날짜를 구한다. */
export async function getMealSourceSeoulDate(source: MealSource): Promise<string | null> {
  const supabase = createServiceRoleClient();

  if (source.visitId) {
    const { data } = await supabase.from("visits").select("visit_date").eq("id", source.visitId).maybeSingle();
    return data?.visit_date ?? null;
  }

  if (source.appointmentId) {
    const { data } = await supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("id", source.appointmentId)
      .maybeSingle();
    return data ? getSeoulDateString(new Date(data.scheduled_at)) : null;
  }

  return null;
}
```

- [ ] **Step 6: `upsertMealRecord`에 이벤트 훅 추가(신규 기록에만 — 수정은 제외)**

`src/app/reviews/new/actions.ts` 상단 import에 추가:

```ts
import { recordAchievementEvent } from "@/lib/achievements/events";
import { getMealSourceSeoulDate } from "@/lib/meals/queries";
import { isMondaySoupMenuName, isSeoulMonday } from "@/lib/achievements/monday-soup";
```

`upsertMealRecord` 안의 다음 블록:

```ts
  if (result.error || !result.data) {
    throw new Error("먹은 메뉴 기록 저장에 실패했습니다.");
  }

  redirectToMealForm(restaurantId, visitId, appointmentId, "saved");
```

을 아래와 같이 바꿔 `redirectToMealForm` 호출 전에 이벤트 훅을 추가한다(`existing`이 없을 때, 즉 신규 생성일 때만):

```ts
  if (result.error || !result.data) {
    throw new Error("먹은 메뉴 기록 저장에 실패했습니다.");
  }

  if (!existing) {
    const seoulDate = await getMealSourceSeoulDate(completedSource);
    if (seoulDate && isSeoulMonday(seoulDate) && isMondaySoupMenuName(menuName!)) {
      await recordAchievementEvent({
        employeeId: employee.id,
        eventType: "MEAL_RECORD_MONDAY_SOUP",
        eventKey: `MEAL_RECORD_MONDAY_SOUP:${result.data.id}`,
        referenceType: "meal_record",
        referenceId: result.data.id,
      });
    }
  }

  redirectToMealForm(restaurantId, visitId, appointmentId, "saved");
```

- [ ] **Step 7: 마이그레이션 파일 생성(Task 3+4 공용)**

`supabase/migrations/0055_achievements_hidden_monday_reroll.sql`:

```sql
-- 숨겨진 업적: 월요일부터 든든하게 / 선택의 늪
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 개발 명세 11.1절/11.2절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('HIDDEN_MONDAY_SOUP', '월요일부터 든든하게', '한 주의 시작은 역시 든든한 국물입니다.', 'HIDDEN', 'SPECIAL', 1, 20, true, 520),
  ('HIDDEN_REROLL_10', '선택의 늪', '추천은 충분했지만 결정은 쉽지 않았습니다.', 'HIDDEN', 'SPECIAL', 1, 20, true, 530)
on conflict (code) do nothing;
```

- [ ] **Step 8: `EVENT_ACHIEVEMENT_CODES`에 추가**

`src/lib/achievements/definitions.ts`:

```ts
  MEAL_RECORD_MONDAY_SOUP: ["HIDDEN_MONDAY_SOUP"],
```

- [ ] **Step 9: 전체 확인**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: 모두 통과

- [ ] **Step 10: Commit**

```bash
git add src/lib/achievements/monday-soup.ts src/lib/achievements/monday-soup.test.ts src/lib/meals/queries.ts src/app/reviews/new/actions.ts src/lib/achievements/definitions.ts supabase/migrations/0055_achievements_hidden_monday_reroll.sql
git commit -m "feat: add hidden HIDDEN_MONDAY_SOUP achievement"
```

---

### Task 4: 숨겨진 업적 — 선택의 늪 (HIDDEN_REROLL_10)

**Files:**
- Modify: `src/lib/recommend/exclusion-cookie.ts`
- Test: `src/lib/recommend/exclusion-cookie.test.ts` (기존 파일에 테스트 추가)
- Modify: `src/app/recommend/actions.ts` (`rerollRecommendation`)

**Interfaces:**
- Consumes: `getExclusionList(): Promise<string[]>`, `addExclusion(list, restaurantId): string[]` (기존, `src/lib/recommend/exclusion-cookie.ts`)
- Produces: `hasReachedRerollThreshold(excludedCount: number, threshold?: number): boolean` — 순수 함수.

> **범위 결정:** 명세는 "한 번의 추천 세션"을 기준으로 하지만, 이 프로젝트에는 세션 개념이 없다. 대신 이미 있는 "오늘의 제외 목록"(자정에 초기화되는 쿠키) 길이를 그대로 재사용한다 — 리롤 1회마다 제외 목록에 식당이 하나씩 쌓이므로, 길이가 10에 도달하면 "오늘 10번 리롤했다"와 근사적으로 같다. 완벽한 세션 스코프는 아니지만 합리적인 근사이며 새 테이블이 필요 없다. 이 근사를 받아들일 수 없다면 이 태스크 전에 먼저 논의한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/recommend/exclusion-cookie.test.ts`에 추가(파일 하단):

```ts
import { hasReachedRerollThreshold } from "./exclusion-cookie";

describe("hasReachedRerollThreshold", () => {
  it("10개 미만이면 false다", () => {
    expect(hasReachedRerollThreshold(9)).toBe(false);
  });

  it("정확히 10개면 true다", () => {
    expect(hasReachedRerollThreshold(10)).toBe(true);
  });

  it("10개를 넘어도 true다", () => {
    expect(hasReachedRerollThreshold(15)).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/recommend/exclusion-cookie.test.ts`
Expected: FAIL — `hasReachedRerollThreshold` is not exported

- [ ] **Step 3: 최소 구현 작성**

`src/lib/recommend/exclusion-cookie.ts`에 추가:

```ts
export const REROLL_ACHIEVEMENT_THRESHOLD = 10;

/** 오늘의 제외 목록 길이가 임계값(기본 10) 이상인지 판정한다(숨겨진 업적 "선택의 늪"). */
export function hasReachedRerollThreshold(excludedCount: number, threshold = REROLL_ACHIEVEMENT_THRESHOLD): boolean {
  return excludedCount >= threshold;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/recommend/exclusion-cookie.test.ts`
Expected: PASS

- [ ] **Step 5: `rerollRecommendation`에 이벤트 훅 추가**

`src/app/recommend/actions.ts`의 `requireEmployee()`는 employee를 반환하지 않으므로, `rerollRecommendation` 안에서 직접 `getCurrentEmployee()`를 호출하도록 바꾼다. 상단 import에 추가:

```ts
import { recordAchievementEvent } from "@/lib/achievements/events";
import { hasReachedRerollThreshold } from "@/lib/recommend/exclusion-cookie";
```

`rerollRecommendation` 함수를 다음과 같이 수정(기존 `await requireEmployee();` 줄을 대체):

```ts
export async function rerollRecommendation(
  mainRestaurantId: string,
  rawConditions: RecommendConditionsInput
) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new Error("로그인이 필요합니다.");
  }

  const parsed = recommendConditionsSchema.safeParse(rawConditions);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "조건 값이 올바르지 않습니다.");
  }

  if (typeof mainRestaurantId === "string" && UUID_PATTERN.test(mainRestaurantId)) {
    const current = await getExclusionList();
    const updated = addExclusion(current, mainRestaurantId);
    await setExclusionList(updated);

    if (hasReachedRerollThreshold(updated.length)) {
      await recordAchievementEvent({
        employeeId: employee.id,
        eventType: "RECOMMENDATION_REROLLED_10",
        eventKey: `RECOMMENDATION_REROLLED_10:${employee.id}:${getSeoulDateString(new Date())}`,
        referenceType: "employee",
        referenceId: employee.id,
      });
    }
  }

  redirect(buildRecommendUrl(parsed.data));
}
```

`getCurrentEmployee`는 이미 `@/lib/auth/session`에서 import돼 있다(`decideRecommendedRestaurant`용). `getSeoulDateString`만 새로 추가한다:

```ts
import { getSeoulDateString } from "@/lib/visits/validation";
```

- [ ] **Step 6: `EVENT_ACHIEVEMENT_CODES`에 추가**

`src/lib/achievements/definitions.ts`:

```ts
  RECOMMENDATION_REROLLED_10: ["HIDDEN_REROLL_10"],
```

- [ ] **Step 7: 전체 확인**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: 모두 통과

- [ ] **Step 8: Commit**

```bash
git add src/lib/recommend/exclusion-cookie.ts src/lib/recommend/exclusion-cookie.test.ts src/app/recommend/actions.ts src/lib/achievements/definitions.ts
git commit -m "feat: add hidden HIDDEN_REROLL_10 achievement"
```

---

## 마무리 체크리스트 (모든 태스크 완료 후)

- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` 전체 통과 확인
- [ ] `npx supabase migration list --linked`로 0054/0055가 로컬에만 있고 원격에는 아직 없는지 확인
- [ ] 사용자에게 두 마이그레이션 적용 여부를 확인한 뒤 `npx supabase db push --linked` 실행
- [ ] `git push origin main` 여부를 사용자에게 확인 후 실행(이 저장소의 기존 관례: 커밋/푸시는 명시적 요청이 있을 때만)
- [ ] 이 계획이 완료되면 앤시점심기술 업적 시스템 1차 필수 27개 업적이 모두 구현된 상태가 된다 — 이후 작업은 명세 17.2절(2차 확장 업적)과 메뉴 월드컵 고도화(영업중 필터, 취향 반영, 일일 제한) 및 `/achievements` 화면의 단계형 카드 묶음(명세 12.2절)이다.
