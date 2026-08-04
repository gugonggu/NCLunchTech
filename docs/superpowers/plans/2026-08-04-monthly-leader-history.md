# 월간 리더 기록 및 이달의 리더 배지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 과거 월의 확정 리더보드와 공개 `이달의 리더` 배지를 제공한다.

**Architecture:** `src/lib/monthly-leaders`의 순수 계산기와 서버 전용 확정/조회 계층을 분리한다. 확정 결과는 독립 스냅샷 테이블에 저장하고, `/leaderboard`는 현재 월의 실시간 결과 또는 선택한 확정 월 결과를 렌더링한다. 배지 조회는 직원 ID 묶음 단위 API로 제공해 리뷰 목록에서 N+1 요청이 생기지 않게 한다.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL/service-role, Zod, Vitest, Tailwind CSS, Vercel Cron.

## Global Constraints

- 날짜와 월 경계는 모두 Asia/Seoul 기준이다.
- 브라우저는 Supabase DB에 직접 접근하지 않는다.
- 확정 스냅샷은 원천 데이터, 닉네임, 직원 활성 상태가 바뀐 뒤에도 수정하지 않는다.
- 수상은 기존 `achievements` 체계가 아닌 월별 스냅샷의 `is_monthly_leader`다.
- DB migration은 로컬 파일만 만들며, 실제 Supabase 적용 전에는 사용자 승인을 다시 받는다.
- 배포 환경에는 `CRON_SECRET`을 설정하고 값은 코드·로그·커밋에 남기지 않는다.

---

## 파일 구조

- Create `supabase/migrations/0064_monthly_leaderboard_history.sql`: 확정 월/순위 스냅샷, 제약, 인덱스, RLS, 원자적 확정 RPC.
- Create `src/lib/monthly-leaders/ranking.ts` + test: 합산 점수, 공동 순위, 수상자 결정 순수 함수.
- Create `src/lib/monthly-leaders/queries.ts` + test: 활동 로드, 미확정 과거 월 확정, 과거 결과·배지 조회.
- Create `src/lib/monthly-leaders/validation.ts` + test: `YYYY-MM` 선택값과 Cron 인증 검증.
- Create `src/app/api/cron/monthly-leaderboard/route.ts` + test, `vercel.json`: 매일 KST 00:00 호출하고 월 1일에만 마감.
- Modify `src/lib/leaderboard.ts`, `src/lib/leaderboard-queries.ts`: 현재 월 합산 결과와 선택한 월 결과 계약.
- Modify `src/app/leaderboard/page.tsx` + test: URL 기반 월 선택, 합산/세부 점수, 수상 표기.
- Create `src/components/MonthlyLeaderBadge.tsx` + test: 최신 수상 월 공개 배지.
- Modify `src/lib/reviews/queries.ts` + test and `src/app/restaurants/[id]/page.tsx`: 리뷰 작성자 배지 일괄 조회·표시.
- Modify `src/app/me/page.tsx` + test, create `src/app/employees/[id]/page.tsx` + test: 본인/타인 공개 수상 이력.
- Modify `.env.local.example`: `CRON_SECRET=` 설명만 추가.

### Task 1: 스냅샷 스키마와 합산 순위 계산

**Files:** Create migration, `src/lib/monthly-leaders/ranking.ts`, `ranking.test.ts`; modify `src/lib/leaderboard.ts`, `leaderboard.test.ts`.

**Interfaces:** `buildMonthlyLeaderEntries(employees, activities, now)` returns `{ monthKey, entries: MonthlyLeaderEntry[] }`; each entry has `employeeId`, `nickname`, `reviewScore`, `explorerScore`, `menuScore`, `totalScore`, `rank`, `isMonthlyLeader`.

- [ ] **Step 1: 실패 테스트를 작성한다.** 7월 활동에서 리뷰 2/고유 식당 1/메뉴 1인 직원의 `totalScore`가 4이고, 같은 최고 점수 두 명 모두 `rank: 1`, `isMonthlyLeader: true`인지 검증한다. 0점 직원과 월 경계 밖 활동도 제외한다.
- [ ] **Step 2: 테스트가 실패하는지 확인한다.** Run: `npx vitest run src/lib/monthly-leaders/ranking.test.ts`. Expected: 모듈 없음으로 FAIL.
- [ ] **Step 3: 최소 구현을 작성한다.** 기존 `buildMonthlyLeaderboard`와 같은 완료 방문 원천을 사용해 세 점수를 계산하고, `totalScore` 내림차순/닉네임 오름차순으로 정렬한 뒤 동점의 순위를 보존한다.
- [ ] **Step 4: migration을 작성한다.** `monthly_leaderboard_periods(month_key date unique, finalized_at timestamptz)`와 `monthly_leaderboard_entries(period_id uuid, employee_id uuid, nickname_snapshot text, review_score integer, explorer_score integer, menu_score integer, total_score integer, rank integer, is_monthly_leader boolean, unique(period_id, employee_id))`를 만든다. 각 점수는 0 이상, `total_score = review_score + explorer_score + menu_score` 체크, period/employee/leader 조회 인덱스와 RLS를 추가한다. `finalize_monthly_leaderboard(p_month_key date, p_entries jsonb)` SECURITY DEFINER RPC는 기존 period가 있으면 false를 반환하고, 없으면 period와 JSON entry 행을 하나의 트랜잭션으로 삽입한 뒤 true를 반환하게 만든다. 실행 권한은 service_role만 부여한다.
- [ ] **Step 5: 통과를 확인한다.** Run: `npx vitest run src/lib/monthly-leaders/ranking.test.ts src/lib/leaderboard.test.ts`. Expected: PASS.
- [ ] **Step 6: 커밋한다.** `git commit -m "feat: add monthly leader snapshots"`.

### Task 2: 확정·조회 서비스와 Cron

**Files:** Create `queries.ts`, `queries.test.ts`, `validation.ts`, `validation.test.ts`, cron route/test, `vercel.json`; modify `.env.local.example`.

**Interfaces:** `finalizeMissingMonthlyLeaderboards(now): Promise<void>`, `getMonthlyLeaderboards(): Promise<MonthOption[]>`, `getMonthlyLeaderboard(monthKey, employeeId): Promise<FinalizedLeaderboard | null>`, `getLatestMonthlyLeaderBadges(employeeIds): Promise<Map<string, MonthlyLeaderBadge>>`.

- [ ] **Step 1: 실패 테스트를 작성한다.** 순수 입력/저장 어댑터를 주입해 (a) 첫 확정은 저장, (b) 같은 월 재실행은 저장하지 않음, (c) 활동 없는 월은 period만 저장, (d) 8월 1일 KST에는 7월만 확정, (e) 다른 날 Cron은 no-op임을 검증한다.
- [ ] **Step 2: 실패를 확인한다.** Run: `npx vitest run src/lib/monthly-leaders/queries.test.ts src/lib/monthly-leaders/validation.test.ts`. Expected: FAIL.
- [ ] **Step 3: 서버 구현을 작성한다.** 서비스 role로 모든 과거 미확정 월을 오래된 순서로 읽어 Task 1 계산 결과를 `finalize_monthly_leaderboard` RPC에 전달한다. false 반환 또는 unique 충돌은 이미 확정된 정상 결과로 처리하고, 과거 조회는 스냅샷만 읽는다. 최신 배지는 `is_monthly_leader=true` 행을 월 내림차순으로 직원별 하나만 선택한다.
- [ ] **Step 4: Cron을 추가한다.** `GET /api/cron/monthly-leaderboard`는 `Authorization: Bearer ${CRON_SECRET}`이 아니면 401, KST 1일이 아니면 204, 맞으면 확정 함수를 호출해 JSON 결과를 반환한다. `vercel.json`은 `/api/cron/monthly-leaderboard`를 `0 15 * * *` UTC에 실행한다.
- [ ] **Step 5: 환경 문서를 추가한다.** 예제 파일에 빈 `CRON_SECRET=`과 Vercel Production 환경 변수 설정 설명만 추가한다.
- [ ] **Step 6: 통과를 확인한다.** Run: `npx vitest run src/lib/monthly-leaders`. Expected: PASS.
- [ ] **Step 7: 커밋한다.** `git commit -m "feat: finalize monthly leaderboards"`.

### Task 3: 월 선택 리더보드

**Files:** Modify leaderboard lib/query/page/tests.

- [ ] **Step 1: 실패 UI 테스트를 작성한다.** `/leaderboard?month=2026-07`에서 `2026년 7월`, 합산 1위, 세부 점수, `이달의 리더`를 렌더링하고, 현재 월에서는 기존 세 부문이 유지되는지 검증한다.
- [ ] **Step 2: 실패를 확인한다.** Run: `npx vitest run src/app/leaderboard/page.test.tsx`. Expected: FAIL.
- [ ] **Step 3: 구현한다.** `searchParams.month`를 validation으로 해석한다. 선택기는 현재 월+확정 월만 제공하고, 잘못된/미확정 과거 월은 기본 현재 월로 되돌린다. 과거 월에는 전체 합산 순위와 세부 점수, 공동 수상 배지를 표시한다.
- [ ] **Step 4: 통과를 확인한다.** Run: `npx vitest run src/app/leaderboard/page.test.tsx src/lib/leaderboard.test.ts`. Expected: PASS.
- [ ] **Step 5: 커밋한다.** `git commit -m "feat: browse finalized monthly leaderboards"`.

### Task 4: 공개 배지와 수상 이력

**Files:** Create badge component/test and public employee page/test; modify review queries/test, restaurant page, me page/test.

- [ ] **Step 1: 실패 테스트를 작성한다.** 배지 컴포넌트가 `2026년 7월 이달의 리더`만 출력하고 점수를 출력하지 않는지, 리뷰 두 건의 같은 작성자에 대해 배지 조회가 한 번의 employee-id 묶음으로 이루어지는지, 타인 공개 프로필과 내 프로필이 전체 수상 월을 출력하는지 검증한다.
- [ ] **Step 2: 실패를 확인한다.** Run: `npx vitest run src/components/MonthlyLeaderBadge.test.tsx src/lib/reviews/queries.test.ts src/app/me/page.test.tsx src/app/employees/[id]/page.test.tsx`. Expected: FAIL.
- [ ] **Step 3: 구현한다.** `MonthlyLeaderBadge`를 재사용하고, `getRecentReviews`는 review employee IDs를 배지 서비스에 한 번 전달해 `monthlyLeaderLabel`을 채운다. 식당 상세의 리뷰 닉네임을 `/employees/[id]` 링크로 만들고 그 옆에 표시한다. `/employees/[id]`에는 닉네임·아바타·최신 배지·전체 월 이력을 공개하고, `/me`에도 동일 이력 섹션을 추가한다.
- [ ] **Step 4: 통과를 확인한다.** 위 테스트 명령을 다시 실행한다. Expected: PASS.
- [ ] **Step 5: 커밋한다.** `git commit -m "feat: show public monthly leader badges"`.

### Task 5: 전체 검증과 배포 전 확인

**Files:** 필요한 테스트 보정만 허용한다.

- [ ] **Step 1: 정적 검증을 실행한다.** Run: `npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 2: 전체 단위 테스트를 실행한다.** Run: `npm run test`. Expected: PASS.
- [ ] **Step 3: 프로덕션 빌드를 실행한다.** Run: `npm run build`. Expected: PASS.
- [ ] **Step 4: migration 적용 권한을 사용자에게 확인한다.** 적용 대상 Supabase 프로젝트와 `0064_monthly_leaderboard_history.sql`만 적용한다는 범위를 확인한 뒤에만 DB push를 실행한다.
