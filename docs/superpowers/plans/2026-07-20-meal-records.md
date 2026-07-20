# Meal Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 완료된 개인 방문 또는 약속마다 대표 메뉴 한 개와 실제 지불 가격을 스냅샷으로 저장·수정하고 홈, 약속 상세, 도감에서 확인한다.

**Architecture:** `meal_records` 한 테이블이 개인 방문 또는 약속 출처 하나를 참조한다. 서버 Action은 로그인 직원과 DB의 완료 상태·식당·등록 메뉴 소유 관계를 다시 검증한 뒤 기존 행을 update하거나 새 행을 insert한다. 기존 `/reviews/new` 화면에 독립된 메뉴 기록 폼을 추가하고 리뷰 upsert는 변경하지 않는다.

**Tech Stack:** Next.js 16 Server Components/Server Actions, TypeScript, Supabase Postgres, Zod 4, Vitest, Tailwind CSS

## Global Constraints

- 원격 DB 마이그레이션은 사용자 승인 전 적용하지 않는다.
- 기존 데이터는 수정하거나 보정하지 않는다.
- 대표 메뉴는 완료 출처당 한 개이며 재저장은 수정으로 처리한다.
- 메뉴명은 1~100자, 실제 가격은 0~10,000,000원의 정수다.
- 새 패키지를 설치하지 않고 기존 service-role 서버 접근 구조를 재사용한다.
- 사진, 영수증, 여러 메뉴, 메뉴 반응, 인기 순위, 가격 통계는 제외한다.

---

### Task 1: 0012 스키마 작성과 적용 승인 게이트

**Files:**
- Create: `supabase/migrations/0012_meal_records.sql`
- Create: `src/lib/meals/migration-0012.test.ts`

**Interfaces:**
- Produces: `meal_records(id, employee_id, restaurant_id, visit_id, appointment_id, menu_item_id, menu_name_snapshot, paid_price, created_at, updated_at)`

- [ ] **Step 1: 실패하는 마이그레이션 정적 테스트 작성**

`migration-0012.test.ts`에서 SQL 파일을 읽고 `create table meal_records`, 출처 XOR check, `visit_id` partial unique index, `(employee_id, appointment_id)` partial unique index, 메뉴명 길이 check, 가격 check, `on delete set null`, RLS 활성화를 각각 기대한다.

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/lib/meals/migration-0012.test.ts`
Expected: FAIL because `0012_meal_records.sql` does not exist.

- [ ] **Step 3: 최소 SQL 작성**

```sql
create table meal_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id),
  restaurant_id uuid not null references restaurants (id),
  visit_id uuid references visits (id) on delete cascade,
  appointment_id uuid references appointments (id) on delete cascade,
  menu_item_id uuid references menu_items (id) on delete set null,
  menu_name_snapshot text not null,
  paid_price integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_records_one_source_check check ((visit_id is not null) <> (appointment_id is not null)),
  constraint meal_records_menu_name_check check (char_length(btrim(menu_name_snapshot)) between 1 and 100),
  constraint meal_records_paid_price_check check (paid_price between 0 and 10000000)
);
create unique index meal_records_visit_unique_idx on meal_records (visit_id) where visit_id is not null;
create unique index meal_records_employee_appointment_unique_idx
  on meal_records (employee_id, appointment_id) where appointment_id is not null;
create index meal_records_employee_created_idx on meal_records (employee_id, created_at desc);
alter table meal_records enable row level security;
```

- [ ] **Step 4: GREEN 확인 후 중지**

Run: `npm.cmd run test -- src/lib/meals/migration-0012.test.ts`
Expected: PASS. 사용자에게 SQL 파일, 새 테이블·제약, 기존 데이터 변경 없음과 적용 명령을 보고하고 원격 적용 승인을 기다린다.

- [ ] **Step 5: 승인 후 원격 적용과 구조 확인**

Run only after explicit approval: `npx supabase db push --db-url "$env:SUPABASE_DB_URL" --workdir .`
Verify with read-only catalog queries that the table, constraints, indexes and RLS match `0012_meal_records.sql`. 연결 문자열이나 비밀값은 출력하지 않는다.

---

### Task 2: 입력과 완료 출처 서버 검증

**Files:**
- Create: `src/lib/meals/validation.ts`
- Create: `src/lib/meals/validation.test.ts`
- Create: `src/lib/meals/queries.ts`

**Interfaces:**
- Produces: `mealRecordSchema`, `normalizeMealRecordFormData(formData)`, `getCompletedMealSource(employeeId, restaurantId, source)`, `getMealRecordForSource(employeeId, source)`

- [ ] **Step 1: 입력 검증 RED 테스트 작성**

등록 메뉴만 선택, 직접 입력만 선택, 둘 다 또는 둘 다 없음 거부, 100/101자 경계, 가격 0/10,000,000 허용과 음수·소수·초과 거부를 테스트한다.

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/lib/meals/validation.test.ts`
Expected: FAIL because `validation.ts` does not exist.

- [ ] **Step 3: Zod 검증 구현**

`menuItemId`와 `customMenuName`을 정규화하고 정확히 하나만 존재하도록 refine한다. 가격 문자열은 숫자로 바꾼 뒤 정수와 범위를 확인한다. 출처 파라미터는 UUID인 `visitId` 또는 `appointmentId` 정확히 하나만 허용한다.

- [ ] **Step 4: 완료 출처 조회 구현**

개인 방문은 `id + employee_id + restaurant_id + completed`, 약속은 `id + restaurant_id`를 조회한 뒤 방장의 완료 상태 또는 본인 참여자의 `completed` 상태를 확인한다. 불일치하면 상세 정보를 노출하지 않고 `null`을 반환한다.

- [ ] **Step 5: GREEN 확인**

Run: `npm.cmd run test -- src/lib/meals/validation.test.ts`
Expected: PASS.

---

### Task 3: 메뉴 기록 저장 Action과 리뷰 화면

**Files:**
- Create: `src/app/reviews/new/MealRecordForm.tsx`
- Modify: `src/app/reviews/new/actions.ts`
- Modify: `src/app/reviews/new/page.tsx`
- Modify: `src/lib/reviews/validation.ts`
- Test: `src/lib/meals/validation.test.ts`

**Interfaces:**
- Produces: `upsertMealRecord(restaurantId, visitId, appointmentId, formData)`

- [ ] **Step 1: 상태 코드와 폼 정규화 RED 테스트 작성**

`saved`, `invalid_input`, `invalid_source`, `invalid_menu`만 화면에 노출되고 임의 문자열은 무시되는지 테스트한다.

- [ ] **Step 2: RED 확인 후 최소 Action 구현**

Action은 로그인, 출처, 입력 순으로 검사한다. 등록 메뉴 ID가 있으면 `menu_items.id + restaurant_id`로 조회한 DB 이름을 사용한다. 기존 출처 행을 조회해 있으면 본인 행만 update하고, 없으면 insert한다. 클라이언트가 직원 ID나 스냅샷 이름을 전달하지 못하게 한다.

- [ ] **Step 3: 기록 폼 추가**

유효한 출처 파라미터가 있고 완료 검증을 통과한 경우에만 등록 메뉴 select, 직접 메뉴명 input, 실제 가격 input, 저장 버튼을 렌더링한다. 기존 기록은 등록 메뉴가 남아 있으면 select를, 삭제됐거나 직접 입력이면 스냅샷 이름을 채운다. 메뉴가 0개여도 직접 입력 폼은 정상 렌더링한다.

- [ ] **Step 4: 링크에 출처 ID 전달**

`src/app/page.tsx`의 완료 개인 방문 링크에는 `visitId`, `src/app/appointments/[id]/page.tsx`의 완료 방장·참여자 링크에는 `appointmentId`를 추가한다. 식당 상세의 리뷰 링크는 출처 없이 기존 리뷰 전용으로 유지한다.

- [ ] **Step 5: 관련 테스트 GREEN 확인**

Run: `npm.cmd run test -- src/lib/meals/validation.test.ts src/lib/reviews/validation.test.ts src/app/page.test.tsx`
Expected: PASS.

---

### Task 4: 홈·약속·도감 기록 표시

**Files:**
- Modify: `src/lib/meals/queries.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/appointments/[id]/page.tsx`
- Modify: `src/lib/collection/queries.ts`
- Modify: `src/app/collection/page.tsx`
- Test: `src/lib/collection/queries.test.ts`

**Interfaces:**
- Produces: `MealRecordSummary`, `getMealRecordForSource`, `getLatestMealRecordsByRestaurant(employeeId)`

- [ ] **Step 1: 식당별 최신 기록 선택 RED 테스트 작성**

같은 식당의 여러 기록에서 `created_at`이 가장 최신인 한 건을 선택하고 기록 없는 식당은 Map에 넣지 않는 순수 함수를 테스트한다.

- [ ] **Step 2: RED 확인 후 조회 구현**

직원 본인 기록만 조회하며 반환값은 `menuName`, `paidPrice`만 화면에 제공한다. 홈은 `visit_id`, 약속 상세는 `(employee_id, appointment_id)`, 도감은 직원의 모든 기록을 생성 시각 내림차순으로 조회한다.

- [ ] **Step 3: 최소 표시 추가**

홈 완료 카드와 약속 완료 영역에 `메뉴명 · 12,000원`을 표시한다. 도감 식당 카드에는 해당 식당의 최신 본인 기록이 있을 때만 같은 형식으로 표시한다.

- [ ] **Step 4: GREEN 확인**

Run: `npm.cmd run test -- src/lib/collection/queries.test.ts src/app/page.test.tsx`
Expected: PASS.

---

### Task 5: 문서, 전체 검증, 단계 커밋

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 상태 갱신**

마이그레이션 범위를 `0001`~`0012`로 바꾸고 `0012`의 메뉴·가격 스냅샷 기능을 한 문장으로 추가한다. 기능 목록에 완료 기록의 대표 메뉴·실제 가격 저장과 수정 정책을 반영한다.

- [ ] **Step 2: 전체 검증**

Run in order:

```text
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
git diff --check
```

Expected: all commands exit 0. `test:integration`과 `test:e2e`는 전용 환경이 없으면 실행하지 않고 통과로 보고하지 않는다.

- [ ] **Step 3: 비밀값과 범위 확인**

추가된 diff에서 비밀값 할당이 0건인지 확인하고, `git status --short`가 이 단계 파일만 포함하는지 확인한다.

- [ ] **Step 4: 구현 커밋**

```text
git add -- supabase/migrations/0012_meal_records.sql src/lib/meals src/app/reviews/new/actions.ts src/app/reviews/new/page.tsx src/app/reviews/new/MealRecordForm.tsx src/lib/reviews/validation.ts src/app/page.tsx src/app/page.test.tsx "src/app/appointments/[id]/page.tsx" src/lib/collection/queries.ts src/lib/collection/queries.test.ts src/app/collection/page.tsx README.md docs/superpowers/plans/2026-07-20-meal-records.md
git commit -m "feat: record meals for completed visits"
```

Git push는 실행하지 않는다.
