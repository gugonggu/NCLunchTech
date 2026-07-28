# 2차 확장 업적(명세 17.2절) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md` 17.2절 "2차 확장 업적" 10개 항목 중, 별도 시스템으로 이미 구현된 "월간 특별 업적"을 제외한 9개를 구현한다.

**Architecture:** 1차 업적과 동일한 엔진(`src/lib/achievements/{events,engine,definitions,recompute}.ts`)을 그대로 재사용한다. 대부분은 기존 이벤트에 코드만 추가하는 증가형이고, 5개(사장님이 알아볼 듯/숨은 맛집 발견/취향 확실하시네요/앤시 외교관/다시 만난 맛)는 `recompute.ts`에 새 지표를 추가하는 재계산형이다("다시 만난 맛"만 컨텍스트가 필요해 `events.ts`에서 별도 분기로 처리한다). "이게 바로 운명?"만 새 컬럼(추천 메인 픽 여부)이 필요하다.

**Tech Stack:** Next.js Server Actions, Supabase(PostgreSQL, service-role 클라이언트), TypeScript, Vitest.

## Global Constraints

- 마이그레이션 번호: 이 저장소의 다른 계획서(`2026-07-28-remaining-achievements.md`)가 이미 `0054`/`0055`를 예약해 두었다(아직 파일로 만들어지지 않았어도 번호 충돌을 피하기 위해). **이 계획은 `0056`부터 시작한다.** 실행 시점에 `supabase/migrations/` 디렉터리를 먼저 확인해 실제 최신 번호+1을 쓴다.
- "단골"(같은 식당 반복 방문) 카테고리는 `achievements.category` CHECK 제약(`START, VISIT, EXPLORE, RECOMMENDATION, WORLDCUP, CONTRIBUTION, SOCIAL, HIDDEN`)에 없다. 새 카테고리를 추가하지 않고 **`VISIT`를 재사용**한다(제약 변경 마이그레이션 불필요).
- **범위 결정(가정)**: 명세 17.2절은 "같은 식당 20회 방문"(사장님이 알아볼 듯)만 명시한다. 원본 기획서 6절에는 더 낮은 단계(여기 괜찮은데 3회, 단골손님 10회)도 있지만 17.1/17.2 어느 목록에도 포함되어 있지 않다 — 이 계획에서는 **17.2에 명시된 20회 단계만 구현**하고, 3회/10회 단계는 구현하지 않는다. 필요하면 별도로 논의 후 추가한다.
- **범위 결정(가정)**: "숨은 맛집 발견"의 "전체 방문 기록"은 `visits` 테이블(개인 방문)만 집계하고 `appointments`(함께 먹기)는 포함하지 않는다 — 전사 집계 쿼리 복잡도를 낮추기 위함이다.
- **범위 결정(가정)**: "이게 바로 운명?"의 "즉시 추천의 첫 번째 식당"은 `/recommend` 메인 카드(대안 카드 제외)를 의미하며, "월드컵 우승 메뉴를 판매"는 그 식당이 **이 직원이 완료한 어떤 월드컵 세션의 우승 메뉴든 하나라도** 정규화된 이름으로 판매하고 있는지로 판정한다(시간 제한 없음).
- "월간 특별 업적"(17.2 마지막 항목)은 이 계획에서 **제외**한다 — 이미 별도 시스템(`src/lib/leaderboard.ts`, `src/lib/monthly-summary.ts`, `src/lib/seasonal-badges.ts`, `/leaderboard` 페이지)으로 구현되어 있고, `achievements` 테이블 기반 업적으로 중복 구현하지 않는다(2026-07-28 세션에서 이미 이렇게 결정됨).
- 업적 판정은 항상 서버에서만 처리한다. 재계산형 업적은 이미 달성한 뒤에는 값이 줄어도 취소하지 않는다(`applyProgressRecompute`의 기존 규칙).
- 날짜/요일 계산은 Asia/Seoul(UTC+9) 기준.
- 완료 후 `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` 전체 통과를 확인한다.
- DB 마이그레이션은 로컬 파일 생성 후, 원격 Supabase(`npx supabase db push --linked`) 적용 전에 반드시 사용자에게 확인한다(이 프로젝트는 로컬 Docker 인스턴스가 없고 원격 프로덕션 DB에 직접 연결되어 있다).

---

### Task 1: 점심은 계속된다 (VISIT_100)

**Files:**
- Create: `supabase/migrations/0056_achievements_expansion_visit_explore.sql` (Task 1+2 공용)
- Modify: `src/lib/achievements/definitions.ts`

**Interfaces:**
- Consumes: 기존 `VISIT_COMPLETED` 이벤트(이미 `src/app/visits/actions.ts`의 `completeTodayVisit`에서 발생 중, 수정 불필요)

- [ ] **Step 1: 마이그레이션 파일 생성(Task 1+2 공용)**

`supabase/migrations/0056_achievements_expansion_visit_explore.sql`:

```sql
-- 2차 확장 업적 1/2: 점심은 계속된다(누적 방문 100회) / 센텀 미식가(서로 다른 식당 40곳)
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 5.4절/7.4절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('VISIT_100', '점심은 계속된다', '앤시점심기술과 함께 100번의 점심을 먹었습니다.', 'VISIT', 'SPECIAL', 100, 40, false, 140),
  ('UNIQUE_RESTAURANT_40', '센텀 미식가', '주변 식당을 물어보면 가장 먼저 떠오르는 사람입니다.', 'EXPLORE', 'ADVANCED', 40, 40, false, 260)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select v.code, v.name, v.description, a.id
from achievements a
join (
  values
    ('VISIT_100_TITLE', 'VISIT_100', '100끼의 기록자', '앤시점심기술과 함께 100번의 점심을 먹었습니다.'),
    ('UNIQUE_RESTAURANT_40_TITLE', 'UNIQUE_RESTAURANT_40', '센텀 미식가', '서로 다른 식당 40곳을 방문했습니다.')
) as v (code, achievement_code, name, description)
  on v.achievement_code = a.code
on conflict (code) do nothing;
```

- [ ] **Step 2: `EVENT_ACHIEVEMENT_CODES`에 추가**

`src/lib/achievements/definitions.ts`의 `VISIT_COMPLETED` 배열에 `"VISIT_100"`과 `"UNIQUE_RESTAURANT_40"`을 추가한다(기존 `"VISIT_50"`, `"UNIQUE_RESTAURANT_20"` 옆에):

```ts
  VISIT_COMPLETED: [
    "FIRST_VISIT",
    "VISIT_5",
    "VISIT_20",
    "VISIT_50",
    "VISIT_100",
    "UNIQUE_RESTAURANT_3",
    "UNIQUE_RESTAURANT_10",
    "UNIQUE_RESTAURANT_20",
    "UNIQUE_RESTAURANT_40",
    "UNIQUE_CATEGORY_3",
    "UNIQUE_CATEGORY_6",
    "HIDDEN_SAME_RESTAURANT_3_CONSECUTIVE",
  ],
```

`UNIQUE_RESTAURANT_40`은 `recompute.ts`의 `RECOMPUTE_METRIC_BY_CODE`에도 추가해야 한다(기존 `unique_restaurant_count` 지표 재사용):

```ts
export const RECOMPUTE_METRIC_BY_CODE: Record<string, RecomputeMetric> = {
  UNIQUE_RESTAURANT_3: "unique_restaurant_count",
  UNIQUE_RESTAURANT_10: "unique_restaurant_count",
  UNIQUE_RESTAURANT_20: "unique_restaurant_count",
  UNIQUE_RESTAURANT_40: "unique_restaurant_count",
  UNIQUE_CATEGORY_3: "unique_category_count",
  UNIQUE_CATEGORY_6: "unique_category_count",
  HIDDEN_SAME_RESTAURANT_3_CONSECUTIVE: "same_restaurant_streak_3",
};
```

(파일: `src/lib/achievements/recompute.ts`)

- [ ] **Step 3: 확인**

Run: `npm run typecheck && npm run test`
Expected: 통과(새 순수 로직 없음 — 기존 엔진 재사용이라 신규 단위 테스트 불필요)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0056_achievements_expansion_visit_explore.sql src/lib/achievements/definitions.ts src/lib/achievements/recompute.ts
git commit -m "feat: add VISIT_100 and UNIQUE_RESTAURANT_40 achievements"
```

---

### Task 2: 사장님이 알아볼 듯 (RESTAURANT_VISIT_20 — 같은 식당 최다 방문 횟수)

**Files:**
- Create: `src/lib/collection/restaurant-visit-counts.ts`
- Test: `src/lib/collection/restaurant-visit-counts.test.ts`
- Modify: `src/lib/achievements/recompute.ts`
- Modify: `src/lib/achievements/definitions.ts`
- Modify: `supabase/migrations/0056_achievements_expansion_visit_explore.sql` (achievements insert에 한 줄 추가)

**Interfaces:**
- Consumes: 없음(신규)
- Produces: `countVisitsPerRestaurant(rows: { restaurantId: string }[]): Map<string, number>` (순수 함수), `getMaxSingleRestaurantVisitCount(employeeId: string): Promise<number>` (DB 조회)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/collection/restaurant-visit-counts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { countVisitsPerRestaurant } from "./restaurant-visit-counts";

describe("countVisitsPerRestaurant", () => {
  it("식당별 방문 횟수를 센다", () => {
    const result = countVisitsPerRestaurant([
      { restaurantId: "r-1" },
      { restaurantId: "r-1" },
      { restaurantId: "r-2" },
    ]);
    expect(result).toEqual(new Map([["r-1", 2], ["r-2", 1]]));
  });

  it("빈 배열이면 빈 Map이다", () => {
    expect(countVisitsPerRestaurant([])).toEqual(new Map());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/collection/restaurant-visit-counts.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 작성**

`src/lib/collection/restaurant-visit-counts.ts`:

```ts
import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** 완료 방문 목록에서 식당별 방문 횟수를 센다(순수 함수, DB 접근 없음). */
export function countVisitsPerRestaurant(rows: { restaurantId: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.restaurantId, (counts.get(row.restaurantId) ?? 0) + 1);
  }
  return counts;
}

/**
 * 개인 방문(visits) 완료 기록 기준으로, 이 직원이 가장 많이 방문한 단일 식당의 방문 횟수를 구한다.
 * "사장님이 알아볼 듯" 업적(같은 식당 20회)의 재계산 지표로 쓴다. 함께 먹기(appointments)는
 * 포함하지 않는다(개인 방문만 명확히 "그 식당에 그 사람으로" 간 기록이라 판단).
 */
export async function getMaxSingleRestaurantVisitCount(employeeId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("visits")
    .select("restaurant_id")
    .eq("employee_id", employeeId)
    .eq("status", "completed");

  const counts = countVisitsPerRestaurant((data ?? []).map((row) => ({ restaurantId: row.restaurant_id })));
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/collection/restaurant-visit-counts.test.ts`
Expected: PASS

- [ ] **Step 5: `recompute.ts`에 새 지표 연결**

`src/lib/achievements/recompute.ts` 수정:

```ts
import { getMaxSingleRestaurantVisitCount } from "@/lib/collection/restaurant-visit-counts";

export type RecomputeMetric =
  | "unique_restaurant_count"
  | "unique_category_count"
  | "same_restaurant_streak_3"
  | "max_single_restaurant_visit_count";

export const RECOMPUTE_METRIC_BY_CODE: Record<string, RecomputeMetric> = {
  // ...(Task 1에서 추가한 항목들 그대로)
  RESTAURANT_VISIT_20: "max_single_restaurant_visit_count",
};
```

`computeRecomputeMetric` 함수의 분기에 추가(기존 `if/else` 체인 마지막에):

```ts
export async function computeRecomputeMetric(employeeId: string, metric: RecomputeMetric): Promise<number> {
  if (metric === "unique_restaurant_count") {
    const visitedIds = await getVisitedRestaurantIds(employeeId);
    return visitedIds.size;
  }
  if (metric === "unique_category_count") {
    return computeUniqueCategoryCount(employeeId);
  }
  if (metric === "max_single_restaurant_visit_count") {
    return getMaxSingleRestaurantVisitCount(employeeId);
  }
  return computeSameRestaurantStreak(employeeId);
}
```

- [ ] **Step 6: `EVENT_ACHIEVEMENT_CODES`에 추가**

`src/lib/achievements/definitions.ts`의 `VISIT_COMPLETED` 배열에 `"RESTAURANT_VISIT_20"` 추가.

- [ ] **Step 7: 마이그레이션에 achievements/titles 추가**

`supabase/migrations/0056_achievements_expansion_visit_explore.sql`의 첫 `insert into achievements (...) values (` 블록에 세 번째 행 추가:

```sql
  ('RESTAURANT_VISIT_20', '사장님이 알아볼 듯', '이 정도면 직원보다 먼저 출근했을 수도 있습니다.', 'VISIT', 'ADVANCED', 20, 40, false, 150),
```

그리고 titles insert의 `values (...)`에도 추가:

```sql
    ('RESTAURANT_VISIT_20_TITLE', 'RESTAURANT_VISIT_20', '사장님이 알아볼 듯', '같은 식당을 20회 방문했습니다.'),
```

- [ ] **Step 8: 전체 확인**

Run: `npm run typecheck && npm run lint && npm run test`

- [ ] **Step 9: Commit**

```bash
git add src/lib/collection/restaurant-visit-counts.ts src/lib/collection/restaurant-visit-counts.test.ts src/lib/achievements/recompute.ts src/lib/achievements/definitions.ts supabase/migrations/0056_achievements_expansion_visit_explore.sql
git commit -m "feat: add RESTAURANT_VISIT_20 achievement (max single-restaurant visits)"
```

---

### Task 3: 데이터 엔지니어 (CONTRIBUTION_TOTAL_30)

**Files:**
- Create: `supabase/migrations/0057_achievements_expansion_contribution.sql`
- Modify: `src/lib/achievements/definitions.ts`

**Interfaces:**
- Consumes: 기존 `MENU_CREATED`, `RESTAURANT_INFO_UPDATED` 이벤트(둘 다 이미 존재 — `2026-07-28-remaining-achievements.md` 계획의 Task 1/2에서 만든다. **이 태스크는 그 계획이 먼저 실행된 뒤에 진행한다.**)

> 참고: 같은 업적 코드를 서로 다른 두 이벤트 타입의 매핑 배열에 동시에 넣으면, 두 이벤트 모두 같은 `user_achievement_progress` 행의 `current_value`를 함께 증가시킨다(진행도가 `achievement_id`로만 구분되기 때문). 새 엔진 로직이 필요 없다.

- [ ] **Step 1: 마이그레이션 파일 생성**

`supabase/migrations/0057_achievements_expansion_contribution.sql`:

```sql
-- 2차 확장 업적: 데이터 엔지니어(메뉴 등록 + 정보 수정 합산 30회)
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 9.8절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('CONTRIBUTION_TOTAL_30', '데이터 엔지니어', '앤시점심기술의 데이터를 더 정확하게 만들었습니다.', 'CONTRIBUTION', 'ADVANCED', 30, 40, false, 350)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'CONTRIBUTION_TOTAL_30_TITLE', '점심 데이터 엔지니어', '메뉴 등록·정보 수정을 합쳐 30회 기여했습니다.', a.id
from achievements a
where a.code = 'CONTRIBUTION_TOTAL_30'
on conflict (code) do nothing;
```

- [ ] **Step 2: `EVENT_ACHIEVEMENT_CODES`에 추가**

`src/lib/achievements/definitions.ts`:

```ts
  MENU_CREATED: ["MENU_APPROVED_5", "CONTRIBUTION_TOTAL_30"],
  RESTAURANT_INFO_UPDATED: ["INFO_UPDATE_APPROVED_5", "CONTRIBUTION_TOTAL_30"],
```

(`MENU_APPROVED_5`/`RESTAURANT_INFO_UPDATED`은 `2026-07-28-remaining-achievements.md` 계획에서 이미 추가되어 있어야 한다 — 없다면 그 계획을 먼저 실행한다.)

- [ ] **Step 3: 확인**

Run: `npm run typecheck && npm run test`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0057_achievements_expansion_contribution.sql src/lib/achievements/definitions.ts
git commit -m "feat: add CONTRIBUTION_TOTAL_30 achievement across menu/info events"
```

---

### Task 4: 취향 확실하시네요 (WORLDCUP_SAME_MENU_WIN_5)

**Files:**
- Create: `src/lib/worldcup/menu-win-counts.ts`
- Test: `src/lib/worldcup/menu-win-counts.test.ts`
- Modify: `src/lib/achievements/recompute.ts`
- Modify: `src/lib/achievements/definitions.ts`
- Create: `supabase/migrations/0058_achievements_expansion_worldcup_social.sql` (Task 4+5 공용)

**Interfaces:**
- Produces: `countWinsPerMenuKey(sessions: { winnerMenuKey: string }[]): Map<string, number>` (순수 함수), `getMaxWorldcupMenuWinCount(employeeId: string): Promise<number>` (DB 조회)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/worldcup/menu-win-counts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { countWinsPerMenuKey } from "./menu-win-counts";

describe("countWinsPerMenuKey", () => {
  it("우승 메뉴별 횟수를 센다", () => {
    const result = countWinsPerMenuKey([
      { winnerMenuKey: "돈까스" },
      { winnerMenuKey: "돈까스" },
      { winnerMenuKey: "김치찌개" },
    ]);
    expect(result).toEqual(new Map([["돈까스", 2], ["김치찌개", 1]]));
  });

  it("완료된 세션이 없으면 빈 Map이다", () => {
    expect(countWinsPerMenuKey([])).toEqual(new Map());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/worldcup/menu-win-counts.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 작성**

`src/lib/worldcup/menu-win-counts.ts`:

```ts
import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** 완료된 월드컵 세션들에서, 우승 메뉴 키(정규화된 이름)별 우승 횟수를 센다(순수 함수). */
export function countWinsPerMenuKey(sessions: { winnerMenuKey: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    counts.set(session.winnerMenuKey, (counts.get(session.winnerMenuKey) ?? 0) + 1);
  }
  return counts;
}

/** 이 직원이 완료한 월드컵(메뉴+식당 모두 포함) 중, 가장 많이 우승한 단일 메뉴의 우승 횟수를 구한다. */
export async function getMaxWorldcupMenuWinCount(employeeId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("menu_worldcup_sessions")
    .select("winner_menu_key")
    .eq("employee_id", employeeId)
    .eq("status", "COMPLETED")
    .not("winner_menu_key", "is", null);

  const counts = countWinsPerMenuKey((data ?? []).map((row) => ({ winnerMenuKey: row.winner_menu_key as string })));
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/worldcup/menu-win-counts.test.ts`
Expected: PASS

- [ ] **Step 5: `recompute.ts`에 연결**

`src/lib/achievements/recompute.ts`에 지표 타입 `"max_worldcup_menu_win_count"` 추가, `RECOMPUTE_METRIC_BY_CODE`에 `WORLDCUP_SAME_MENU_WIN_5: "max_worldcup_menu_win_count"` 추가, `computeRecomputeMetric`에 분기 추가(Task 2의 패턴과 동일).

- [ ] **Step 6: `EVENT_ACHIEVEMENT_CODES`에 추가**

`src/lib/achievements/definitions.ts`의 `WORLDCUP_COMPLETED` 배열에 `"WORLDCUP_SAME_MENU_WIN_5"` 추가.

- [ ] **Step 7: 확인 및 Commit**

Run: `npm run typecheck && npm run lint && npm run test`

```bash
git add src/lib/worldcup/menu-win-counts.ts src/lib/worldcup/menu-win-counts.test.ts src/lib/achievements/recompute.ts src/lib/achievements/definitions.ts
git commit -m "feat: add WORLDCUP_SAME_MENU_WIN_5 achievement"
```

(마이그레이션은 Task 5와 함께 Step 아래에서 만든다 — 두 업적을 한 파일에 담는다.)

---

### Task 5: 앤시 외교관 (SOCIAL_UNIQUE_PARTNERS_15)

**Files:**
- Create: `src/lib/appointments/dining-partners.ts`
- Test: `src/lib/appointments/dining-partners.test.ts`
- Modify: `src/lib/achievements/recompute.ts`
- Modify: `src/lib/achievements/definitions.ts`
- Create: `supabase/migrations/0058_achievements_expansion_worldcup_social.sql` (Task 4+5 공용 — 아직 안 만들었다면 여기서 생성)

**Interfaces:**
- Produces: `dedupePartnerIds(rows: { partnerId: string }[], selfId: string): Set<string>` (순수 함수), `getUniqueDiningPartnerCount(employeeId: string): Promise<number>` (DB 조회)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/appointments/dining-partners.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dedupePartnerIds } from "./dining-partners";

describe("dedupePartnerIds", () => {
  it("본인을 제외하고 중복 없는 동료 id 집합을 만든다", () => {
    const result = dedupePartnerIds(
      [{ partnerId: "e-1" }, { partnerId: "e-2" }, { partnerId: "e-1" }, { partnerId: "me" }],
      "me"
    );
    expect(result).toEqual(new Set(["e-1", "e-2"]));
  });

  it("동료가 없으면 빈 집합이다", () => {
    expect(dedupePartnerIds([], "me")).toEqual(new Set());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/appointments/dining-partners.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현 작성**

`src/lib/appointments/dining-partners.ts`:

```ts
import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** 동행자 id 목록에서 본인을 제외한 고유 id 집합을 만든다(순수 함수). */
export function dedupePartnerIds(rows: { partnerId: string }[], selfEmployeeId: string): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.partnerId !== selfEmployeeId) {
      ids.add(row.partnerId);
    }
  }
  return ids;
}

/**
 * 이 직원이 완료된 함께 먹기 약속에서 실제로 같이 식사한(둘 다 완료 처리한) 서로 다른 동료 수를 구한다.
 * 방장으로 완료한 약속의 완료 참여자들 + 참여자로 완료한 약속의 방장(완료 시)·다른 완료 참여자들을 합친다.
 */
export async function getUniqueDiningPartnerCount(employeeId: string): Promise<number> {
  const supabase = createServiceRoleClient();

  const [{ data: hostedAppointments }, { data: joinedParticipantRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .eq("host_employee_id", employeeId)
      .eq("host_attendance_status", "completed"),
    supabase
      .from("appointment_participants")
      .select("appointment_id, appointments!inner(id, host_employee_id, host_attendance_status)")
      .eq("employee_id", employeeId)
      .eq("status", "completed"),
  ]);

  const hostedAppointmentIds = (hostedAppointments ?? []).map((a) => a.id);
  const joinedAppointmentIds = (joinedParticipantRows ?? [])
    .map((row) => {
      const appt = row.appointments as unknown as { id: string; host_employee_id: string; host_attendance_status: string | null };
      return appt.host_attendance_status === "completed" ? { id: appt.id, hostId: appt.host_employee_id } : null;
    })
    .filter((v): v is { id: string; hostId: string } => v !== null);

  const partnerRows: { partnerId: string }[] = [];

  if (hostedAppointmentIds.length > 0) {
    const { data: hostedParticipants } = await supabase
      .from("appointment_participants")
      .select("employee_id")
      .in("appointment_id", hostedAppointmentIds)
      .eq("status", "completed");
    for (const row of hostedParticipants ?? []) {
      partnerRows.push({ partnerId: row.employee_id });
    }
  }

  for (const joined of joinedAppointmentIds) {
    partnerRows.push({ partnerId: joined.hostId });
  }

  if (joinedAppointmentIds.length > 0) {
    const { data: otherParticipants } = await supabase
      .from("appointment_participants")
      .select("employee_id")
      .in("appointment_id", joinedAppointmentIds.map((j) => j.id))
      .eq("status", "completed");
    for (const row of otherParticipants ?? []) {
      partnerRows.push({ partnerId: row.employee_id });
    }
  }

  return dedupePartnerIds(partnerRows, employeeId).size;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/appointments/dining-partners.test.ts`
Expected: PASS

- [ ] **Step 5: `recompute.ts`에 연결**

지표 타입에 `"unique_dining_partner_count"` 추가, `RECOMPUTE_METRIC_BY_CODE`에 `SOCIAL_UNIQUE_PARTNERS_15: "unique_dining_partner_count"` 추가, `computeRecomputeMetric` 분기 추가(`getUniqueDiningPartnerCount` 호출).

- [ ] **Step 6: `EVENT_ACHIEVEMENT_CODES`에 추가**

`MEAL_GROUP_COMPLETED` 배열에 `"SOCIAL_UNIQUE_PARTNERS_15"` 추가.

- [ ] **Step 7: 마이그레이션 파일 생성(Task 4+5 공용)**

`supabase/migrations/0058_achievements_expansion_worldcup_social.sql`:

```sql
-- 2차 확장 업적: 취향 확실하시네요(월드컵 동일 메뉴 5회 우승) / 앤시 외교관(서로 다른 동료 15명과 식사)
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 8.8절/10.6절.

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('WORLDCUP_SAME_MENU_WIN_5', '취향 확실하시네요', '우승 메뉴가 자꾸 익숙합니다.', 'WORLDCUP', 'INTERMEDIATE', 5, 20, false, 640),
  ('SOCIAL_UNIQUE_PARTNERS_15', '다양한 점심 친구 II', '다양한 동료들과 점심을 함께했습니다.', 'SOCIAL', 'ADVANCED', 15, 40, false, 440)
on conflict (code) do nothing;

insert into titles (code, name, description, achievement_id)
select 'SOCIAL_UNIQUE_PARTNERS_15_TITLE', '앤시 외교관', '서로 다른 동료 15명과 점심을 함께했습니다.', a.id
from achievements a
where a.code = 'SOCIAL_UNIQUE_PARTNERS_15'
on conflict (code) do nothing;
```

- [ ] **Step 8: 확인 및 Commit**

Run: `npm run typecheck && npm run lint && npm run test`

```bash
git add src/lib/appointments/dining-partners.ts src/lib/appointments/dining-partners.test.ts src/lib/achievements/recompute.ts src/lib/achievements/definitions.ts supabase/migrations/0058_achievements_expansion_worldcup_social.sql
git commit -m "feat: add SOCIAL_UNIQUE_PARTNERS_15 achievement"
```

---

### Task 6: 숨은 맛집 발견 (LOW_TRAFFIC_RESTAURANT_VISIT)

**Files:**
- Create: `src/lib/collection/low-traffic-restaurants.ts`
- Test: `src/lib/collection/low-traffic-restaurants.test.ts`
- Modify: `src/lib/achievements/recompute.ts`
- Modify: `src/lib/achievements/definitions.ts`
- Create: `supabase/migrations/0059_achievements_expansion_hidden_and_explore.sql` (Task 6+7+8 공용)

**Interfaces:**
- Produces: `findLowTrafficRestaurantIds(visitedRestaurantIds: string[], globalVisitCounts: Map<string, number>, maxVisits: number): string[]` (순수 함수), `hasVisitedLowTrafficRestaurant(employeeId: string): Promise<boolean>` (DB 조회)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/collection/low-traffic-restaurants.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findLowTrafficRestaurantIds } from "./low-traffic-restaurants";

describe("findLowTrafficRestaurantIds", () => {
  it("전체 방문이 기준 이하인, 내가 방문한 식당만 골라낸다", () => {
    const result = findLowTrafficRestaurantIds(
      ["r-1", "r-2"],
      new Map([["r-1", 5], ["r-2", 6], ["r-3", 2]]),
      5
    );
    expect(result).toEqual(["r-1"]);
  });

  it("내가 방문한 식당이 없으면 빈 배열이다", () => {
    expect(findLowTrafficRestaurantIds([], new Map([["r-1", 1]]), 5)).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/collection/low-traffic-restaurants.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현 작성**

`src/lib/collection/low-traffic-restaurants.ts`:

```ts
import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSeoulDateString } from "@/lib/visits/validation";

export const LOW_TRAFFIC_WINDOW_DAYS = 60;
export const LOW_TRAFFIC_MAX_VISITS = 5;

/** 내가 방문한 식당 중, 최근 60일간 전체 방문(모든 직원 합산)이 기준 이하인 곳만 고른다(순수 함수). */
export function findLowTrafficRestaurantIds(
  myVisitedRestaurantIds: string[],
  globalVisitCounts: Map<string, number>,
  maxVisits: number
): string[] {
  return myVisitedRestaurantIds.filter((id) => (globalVisitCounts.get(id) ?? 0) <= maxVisits);
}

/**
 * 최근 60일간 전체 완료 방문(개인 방문만, 함께 먹기 제외)이 5회 이하인 식당을,
 * 이 직원이 방문한 적 있는지 확인한다(숨은 맛집 발견 업적).
 */
export async function hasVisitedLowTrafficRestaurant(employeeId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const sinceDate = getSeoulDateString(new Date(Date.now() - LOW_TRAFFIC_WINDOW_DAYS * 24 * 60 * 60 * 1000));

  const [{ data: myVisits }, { data: allVisits }] = await Promise.all([
    supabase.from("visits").select("restaurant_id").eq("employee_id", employeeId).eq("status", "completed"),
    supabase.from("visits").select("restaurant_id").eq("status", "completed").gte("visit_date", sinceDate),
  ]);

  const myRestaurantIds = [...new Set((myVisits ?? []).map((v) => v.restaurant_id))];
  if (myRestaurantIds.length === 0) return false;

  const globalCounts = new Map<string, number>();
  for (const row of allVisits ?? []) {
    globalCounts.set(row.restaurant_id, (globalCounts.get(row.restaurant_id) ?? 0) + 1);
  }

  return findLowTrafficRestaurantIds(myRestaurantIds, globalCounts, LOW_TRAFFIC_MAX_VISITS).length > 0;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/collection/low-traffic-restaurants.test.ts`
Expected: PASS

- [ ] **Step 5: `recompute.ts`에 연결**

지표 타입에 `"has_visited_low_traffic_restaurant"` 추가(불리언, 0/1). `RECOMPUTE_METRIC_BY_CODE`에 `LOW_TRAFFIC_RESTAURANT_VISIT: "has_visited_low_traffic_restaurant"` 추가. `computeRecomputeMetric` 분기:

```ts
  if (metric === "has_visited_low_traffic_restaurant") {
    return (await hasVisitedLowTrafficRestaurant(employeeId)) ? 1 : 0;
  }
```

- [ ] **Step 6: `EVENT_ACHIEVEMENT_CODES`에 추가**

`VISIT_COMPLETED` 배열에 `"LOW_TRAFFIC_RESTAURANT_VISIT"` 추가.

- [ ] **Step 7: 확인 및 Commit**

Run: `npm run typecheck && npm run lint && npm run test`

```bash
git add src/lib/collection/low-traffic-restaurants.ts src/lib/collection/low-traffic-restaurants.test.ts src/lib/achievements/recompute.ts src/lib/achievements/definitions.ts
git commit -m "feat: add LOW_TRAFFIC_RESTAURANT_VISIT achievement"
```

(마이그레이션은 Task 8에서 achievements insert와 함께 한 파일로 만든다.)

---

### Task 7: 다시 만난 맛 (HIDDEN_REVISIT_AFTER_60_DAYS)

**Files:**
- Modify: `src/lib/achievements/streak.ts` (같은 파일에 함수 추가 — "같은 식당 관련 재계산" 로직을 모아둔다)
- Modify: `src/lib/achievements/streak.test.ts`
- Modify: `src/lib/visits/queries.ts` (새 쿼리 추가)
- Modify: `src/lib/achievements/recompute.ts`
- Modify: `src/lib/achievements/definitions.ts`

**Interfaces:**
- Produces: `hasRevisitedAfterGap(visitDatesDescending: string[], todayVisitDate: string, minGapDays: number): boolean` (순수 함수)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/achievements/streak.test.ts`에 추가:

```ts
import { hasRevisitedAfterGap } from "./streak";

describe("hasRevisitedAfterGap", () => {
  it("직전 방문이 60일 이상 전이면 true다", () => {
    expect(hasRevisitedAfterGap(["2026-05-20"], "2026-07-28", 60)).toBe(true);
  });

  it("직전 방문이 60일 미만이면 false다", () => {
    expect(hasRevisitedAfterGap(["2026-07-01"], "2026-07-28", 60)).toBe(false);
  });

  it("이전 방문 기록이 없으면(첫 방문) false다", () => {
    expect(hasRevisitedAfterGap([], "2026-07-28", 60)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/achievements/streak.test.ts`
Expected: FAIL — `hasRevisitedAfterGap` is not exported

- [ ] **Step 3: 구현 작성**

`src/lib/achievements/streak.ts`에 추가(`daysBetweenDateStrings`를 import):

```ts
import { daysBetweenDateStrings } from "@/lib/visits/validation";

/**
 * 오늘 이전의 완료 방문 날짜(최근순, 오늘 제외) 중 가장 최근 것과 오늘 사이의 간격이
 * minGapDays 이상인지 판정한다(숨겨진 업적 "다시 만난 맛"). 이전 방문이 없으면(첫 방문) false다.
 */
export function hasRevisitedAfterGap(
  previousVisitDatesDescendingExcludingToday: string[],
  todayVisitDate: string,
  minGapDays: number
): boolean {
  const [mostRecentPrevious] = previousVisitDatesDescendingExcludingToday;
  if (!mostRecentPrevious) return false;
  return daysBetweenDateStrings(todayVisitDate, mostRecentPrevious) >= minGapDays;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/achievements/streak.test.ts`
Expected: PASS

- [ ] **Step 5: 해당 식당의 이전 방문 날짜를 조회하는 쿼리 추가**

`src/lib/visits/queries.ts`에 추가:

```ts
/** 특정 식당에 대한, todayVisitDate 이전(제외)의 완료 방문 날짜를 최근순으로 조회한다("다시 만난 맛"용). */
export async function getPreviousCompletedVisitDatesForRestaurant(
  employeeId: string,
  restaurantId: string,
  todayVisitDate: string
): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("visits")
    .select("visit_date")
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .eq("status", "completed")
    .lt("visit_date", todayVisitDate)
    .order("visit_date", { ascending: false });

  return (data ?? []).map((row) => row.visit_date);
}
```

- [ ] **Step 6: `events.ts`에 이 업적만을 위한 특별 분기 추가**

이 지표는 employeeId만 받는 기존 `computeRecomputeMetric(employeeId, metric)` 시그니처로는 "어느 식당인지"를 알 수 없다(다른 재계산형 업적과 달리 이벤트별 컨텍스트가 필요하다). `RECOMPUTE_METRIC_BY_CODE`에는 추가하지 않고, `src/lib/achievements/events.ts`의 `recordAchievementEvent` 함수 안 `for (const achievement of achievements)` 루프에서 다음과 같이 이 코드만 먼저 처리하고 `continue`한다:

```ts
import { hasRevisitedAfterGap } from "./streak";
import { getPreviousCompletedVisitDatesForRestaurant } from "@/lib/visits/queries";

const REVISIT_GAP_DAYS = 60;

// ... 기존 import/타입 아래, recordAchievementEvent 함수 내부 for 루프 시작 부분에 추가:
for (const achievement of achievements) {
  if (earnedAchievementIds.has(achievement.id)) {
    continue;
  }

  if (achievement.code === "HIDDEN_REVISIT_AFTER_60_DAYS") {
    const restaurantId = params.payload?.restaurantId;
    const visitDate = params.payload?.visitDate;
    if (typeof restaurantId === "string" && typeof visitDate === "string") {
      const previousDates = await getPreviousCompletedVisitDatesForRestaurant(params.employeeId, restaurantId, visitDate);
      if (hasRevisitedAfterGap(previousDates, visitDate, REVISIT_GAP_DAYS)) {
        const { error: earnedError } = await supabase.from("user_achievements").insert({
          employee_id: params.employeeId,
          achievement_id: achievement.id,
          is_new: true,
        });
        if (!earnedError) {
          newlyEarned.push({
            code: achievement.code,
            name: achievement.name,
            description: achievement.description,
            pointReward: achievement.point_reward,
            titleName: extractTitleName(achievement.titles),
          });
        } else if (earnedError.code !== "23505") {
          throw new Error(`업적 달성 저장 실패: ${earnedError.message}`);
        }
      }
    }
    continue;
  }

  // ... 기존 나머지 처리(currentValue, recomputeMetric 등)는 그대로 이어진다
```

이렇게 하면 이 업적은 `user_achievement_progress` 캐시 없이 매번 직접 판정되고(진행도가 0/1이라 캐시 이점이 적음), 나머지 업적은 기존 흐름을 그대로 탄다.

- [ ] **Step 6b: `VISIT_COMPLETED` 이벤트에 payload 추가**

`src/app/visits/actions.ts`의 `completeTodayVisit`에서 `VISIT_COMPLETED` 이벤트 호출에 `payload`를 추가한다:

```ts
  await recordAchievementEvent({
    employeeId: employee.id,
    eventType: "VISIT_COMPLETED",
    eventKey: `VISIT_COMPLETED:${data.id}`,
    referenceType: "visit",
    referenceId: data.id,
    payload: { restaurantId: active.restaurantId, visitDate: today },
  });
```

- [ ] **Step 7: `EVENT_ACHIEVEMENT_CODES`에 추가**

`VISIT_COMPLETED` 배열에 `"HIDDEN_REVISIT_AFTER_60_DAYS"` 추가.

- [ ] **Step 8: 확인 및 Commit**

Run: `npm run typecheck && npm run lint && npm run test`

```bash
git add src/lib/achievements/streak.ts src/lib/achievements/streak.test.ts src/lib/visits/queries.ts src/lib/achievements/events.ts src/lib/achievements/definitions.ts src/app/visits/actions.ts
git commit -m "feat: add hidden HIDDEN_REVISIT_AFTER_60_DAYS achievement"
```

---

### Task 8: 이게 바로 운명? (HIDDEN_RECOMMENDATION_MATCHES_WORLDCUP)

**Files:**
- Create: `supabase/migrations/0059_achievements_expansion_hidden_and_explore.sql` (Task 6/7 achievements seed + `recommendation_selections.is_main_pick` 컬럼 추가, 공용)
- Modify: `src/lib/recommend/selection.ts`
- Modify: `src/app/recommend/actions.ts`, `src/app/recommend/page.tsx`
- Modify: `src/app/visits/actions.ts`
- Modify: `src/lib/achievements/definitions.ts`

**Interfaces:**
- Consumes: `recordRecommendationSelection` (기존, 시그니처 변경)
- Produces: `hasMainRecommendationMatchingWorldcupWinner(employeeId, restaurantId, visitDate): Promise<boolean>`

- [ ] **Step 1: `recommendation_selections`에 `is_main_pick` 컬럼 추가**

`supabase/migrations/0059_achievements_expansion_hidden_and_explore.sql`(Task 6/7 achievements와 공용, 파일 맨 위에 추가):

```sql
-- 2차 확장 업적: 숨은 맛집 발견 / 다시 만난 맛 / 이게 바로 운명? / 데이터 스키마 보강
-- 참고: docs/superpowers/specs/2026-07-28-achievements-worldcup-design.md 7.9절/11.6절/11.8절.

alter table recommendation_selections
  add column if not exists is_main_pick boolean not null default false;

insert into achievements (code, name, description, category, tier, target_value, point_reward, is_hidden, sort_order)
values
  ('LOW_TRAFFIC_RESTAURANT_VISIT', '숨은 맛집 발견', '아직 많은 사람이 찾지 않은 식당을 발견했습니다.', 'EXPLORE', 'INTERMEDIATE', 1, 20, false, 270),
  ('HIDDEN_REVISIT_AFTER_60_DAYS', '다시 만난 맛', '오랜만에 익숙한 식당을 다시 찾았습니다.', 'HIDDEN', 'SPECIAL', 1, 20, true, 540),
  ('HIDDEN_RECOMMENDATION_MATCHES_WORLDCUP', '이게 바로 운명?', '추천과 취향이 완벽하게 일치했습니다.', 'HIDDEN', 'SPECIAL', 1, 30, true, 550)
on conflict (code) do nothing;
```

- [ ] **Step 2: `recordRecommendationSelection`이 메인/대안 여부를 받도록 수정**

`src/lib/recommend/selection.ts`의 `recordRecommendationSelection` 시그니처와 insert를 수정:

```ts
export async function recordRecommendationSelection(
  employeeId: string,
  restaurantId: string,
  isMainPick: boolean,
  now = new Date()
): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from("recommendation_selections").insert({
    employee_id: employeeId,
    restaurant_id: restaurantId,
    is_main_pick: isMainPick,
    selected_at: now.toISOString(),
  });
}
```

같은 파일에 추가:

```ts
/** 오늘(visitDate) 메인 추천으로 결정한 식당인지 확인한다("이게 바로 운명?" 등에서 재사용). */
export async function hasMainRecommendationSelection(
  employeeId: string,
  restaurantId: string,
  visitDate: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const dayStart = `${visitDate}T00:00:00+09:00`;
  const dayEnd = `${visitDate}T23:59:59.999+09:00`;

  const { count } = await supabase
    .from("recommendation_selections")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId)
    .eq("is_main_pick", true)
    .gte("selected_at", dayStart)
    .lte("selected_at", dayEnd);

  return (count ?? 0) > 0;
}
```

- [ ] **Step 3: 호출부 수정 — 메인/대안 카드 구분**

`src/app/recommend/actions.ts`의 `decideRecommendedRestaurant`에 `isMainPick` 매개변수를 추가:

```ts
export async function decideRecommendedRestaurant(restaurantId: string, isMainPick: boolean) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect("/login");
  }

  if (typeof restaurantId === "string" && UUID_PATTERN.test(restaurantId)) {
    await recordRecommendationSelection(employee.id, restaurantId, isMainPick);
  }

  await decideRestaurant(restaurantId);
}
```

`src/app/recommend/page.tsx`의 두 바인딩을 수정:

```ts
decideAction={decideRecommendedRestaurant.bind(null, result.main.id, true)}
```

```ts
decideAction={decideRecommendedRestaurant.bind(null, alt.id, false)}
```

- [ ] **Step 4: 월드컵 우승 메뉴와의 일치 여부 판정 함수 추가**

`src/lib/worldcup/pool-queries.ts`에 추가:

```ts
/** 이 식당이 파는 메뉴 중 하나가, 이 직원이 완료한 어떤 월드컵의 우승 메뉴와 이름이 일치하는지 확인한다. */
export async function restaurantSellsAnyOfEmployeesWorldcupWinners(
  employeeId: string,
  restaurantId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const [{ data: winners }, { data: restaurant }] = await Promise.all([
    supabase
      .from("menu_worldcup_sessions")
      .select("winner_menu_key")
      .eq("employee_id", employeeId)
      .eq("status", "COMPLETED")
      .not("winner_menu_key", "is", null),
    supabase.from("restaurants").select("menu_items(name, is_sold_out)").eq("id", restaurantId).maybeSingle(),
  ]);

  const winnerKeys = new Set((winners ?? []).map((w) => w.winner_menu_key as string));
  if (winnerKeys.size === 0 || !restaurant) return false;

  return (restaurant.menu_items ?? []).some(
    (m: { name: string; is_sold_out: boolean }) => !m.is_sold_out && winnerKeys.has(normalizeMenuName(m.name))
  );
}
```

(`normalizeMenuName`은 이미 같은 파일에서 `./candidates`로부터 import되어 있다.)

- [ ] **Step 5: 방문 완료 시 두 조건을 모두 확인하는 이벤트 훅 추가**

`src/app/visits/actions.ts`의 `completeTodayVisit`에서, 기존 `hasRecommendationSelection(...)` 블록 뒤에 추가:

```ts
  if (
    (await hasMainRecommendationSelection(employee.id, active.restaurantId, today)) &&
    (await restaurantSellsAnyOfEmployeesWorldcupWinners(employee.id, active.restaurantId))
  ) {
    await recordAchievementEvent({
      employeeId: employee.id,
      eventType: "RECOMMENDATION_MATCHES_WORLDCUP_VISIT_COMPLETED",
      eventKey: `RECOMMENDATION_MATCHES_WORLDCUP_VISIT_COMPLETED:${data.id}`,
      referenceType: "visit",
      referenceId: data.id,
    });
  }
```

import 추가:

```ts
import { hasMainRecommendationSelection } from "@/lib/recommend/selection";
import { restaurantSellsAnyOfEmployeesWorldcupWinners } from "@/lib/worldcup/pool-queries";
```

- [ ] **Step 6: `EVENT_ACHIEVEMENT_CODES`에 추가**

```ts
  RECOMMENDATION_MATCHES_WORLDCUP_VISIT_COMPLETED: ["HIDDEN_RECOMMENDATION_MATCHES_WORLDCUP"],
```

- [ ] **Step 7: 전체 확인**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0059_achievements_expansion_hidden_and_explore.sql src/lib/recommend/selection.ts src/app/recommend/actions.ts src/app/recommend/page.tsx src/lib/worldcup/pool-queries.ts src/app/visits/actions.ts src/lib/achievements/definitions.ts
git commit -m "feat: add hidden HIDDEN_RECOMMENDATION_MATCHES_WORLDCUP achievement"
```

---

## Out of Scope

- **월간 특별 업적**(17.2 마지막 항목): 이미 별도 시스템(`leaderboard.ts`/`monthly-summary.ts`/`seasonal-badges.ts`)으로 구현되어 있어 이 계획에서 다루지 않는다.
- 여기 괜찮은데(3회)/단골손님(10회): 17.1/17.2 어느 목록에도 명시되지 않아 이 계획에서 제외했다. 필요하면 별도 논의.

## 마무리 체크리스트 (모든 태스크 완료 후)

- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` 전체 통과 확인
- [ ] `2026-07-28-remaining-achievements.md` 계획이 먼저 실행되어 `MENU_CREATED`/`RESTAURANT_INFO_UPDATED` 이벤트가 이미 존재하는지 확인(Task 3이 이를 전제한다)
- [ ] `npx supabase migration list --linked`로 이 계획에서 만든 마이그레이션(0056~0059, 실제 번호는 실행 시점 확인)이 로컬에만 있는지 확인
- [ ] 사용자에게 마이그레이션 적용 여부를 확인한 뒤 `npx supabase db push --linked` 실행
- [ ] `git push origin main` 여부를 사용자에게 확인 후 실행
