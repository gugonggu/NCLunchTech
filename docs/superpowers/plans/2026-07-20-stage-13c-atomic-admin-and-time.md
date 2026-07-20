# Stage 13-C Atomic Admin and Visit Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 복합 쓰기를 PostgreSQL RPC로 원자화하고 개인 방문은 즉시, 동료 약속은 예정 시각부터 방문 확인할 수 있게 한다.

**Architecture:** `0011_admin_atomic_operations.sql`의 업무별 `security definer` 함수가 데이터 변경과 감사 로그를 한 트랜잭션으로 처리한다. Server Action은 인증·Zod 검증·상태 리다이렉트만 담당한다. 시간 정책은 순수 helper로 검증하고 약속 Action에서 동일한 서버 가드를 사용한다.

**Tech Stack:** Next.js 16 App Router, TypeScript 6, Zod 4, Supabase PostgreSQL/PostgREST RPC, Vitest

## Global Constraints

- 개인 방문은 `planned` 상태 생성 직후부터 확인 가능하다.
- 동료 약속은 `scheduled_at <= now`일 때만 확인 가능하다.
- 개인 방문 시간 입력과 `visits.scheduled_at`은 추가하지 않는다.
- `0011`은 함수와 실행 권한만 추가하고 운영 행을 삭제하거나 일괄 수정하지 않는다.
- RPC는 `service_role`만 실행할 수 있다.
- 약속 생성·알림과 약속 변경·취소 알림은 원자화 범위에서 제외한다.
- 초대 코드를 변경하지 않고 Git push를 수행하지 않는다.

---

### Task 1: 방문 확인 시간과 달력 날짜 검증

**Files:**
- Modify: `src/lib/confirmation-window.test.ts`
- Modify: `src/lib/confirmation-window.ts`
- Modify: `src/lib/appointments/validation.test.ts`
- Modify: `src/lib/appointments/validation.ts`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/lib/appointments/queries.ts`
- Modify: `src/app/appointments/[id]/page.tsx`

**Interfaces:**
- Produces: `hasAppointmentStarted(scheduledAt: Date, now: Date): boolean`
- Produces: strict `parseSeoulDateTimeLocal(value: string): Date | null`

- [ ] **Step 1: 시간 경계와 잘못된 날짜의 실패 테스트 작성**

```ts
expect(hasAppointmentStarted(reference, new Date(reference.getTime() - 1))).toBe(false);
expect(hasAppointmentStarted(reference, reference)).toBe(true);
expect(parseSeoulDateTimeLocal("2026-02-31T12:30")).toBeNull();
expect(parseSeoulDateTimeLocal("2026-13-01T12:30")).toBeNull();
```

홈 테스트의 개인 방문 fixture는 방금 생성된 `updatedAt`을 사용하고도 `방문 확인` 섹션이 보인다고 단언한다.

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/lib/confirmation-window.test.ts src/lib/appointments/validation.test.ts src/app/page.test.tsx`

Expected: 기존 1시간 helper와 날짜 자동 이월 때문에 새 경계 테스트가 실패한다.

- [ ] **Step 3: 최소 구현**

```ts
export function hasAppointmentStarted(scheduledAt: Date, now: Date): boolean {
  return now.getTime() >= scheduledAt.getTime();
}
```

`parseSeoulDateTimeLocal`은 파싱 결과를 `formatSeoulDateTimeLocal`로 왕복해 원래 문자열과 다르면 `null`을 반환한다. 홈의 `soloNeedsConfirmation`은 `todayVisit?.status === "planned"`로 바꾸고 약속 조회·상세 화면은 `hasAppointmentStarted`를 사용한다.

- [ ] **Step 4: GREEN 확인**

Run: `npm.cmd run test -- src/lib/confirmation-window.test.ts src/lib/appointments/validation.test.ts src/app/page.test.tsx`

Expected: 대상 테스트 전부 통과.

### Task 2: 미래 약속 방문 확인 서버 차단

**Files:**
- Create: `src/lib/appointments/attendance.ts`
- Create: `src/lib/appointments/attendance.test.ts`
- Modify: `src/app/appointments/[id]/actions.ts`
- Modify: `src/lib/appointments/validation.ts`

**Interfaces:**
- Produces: `getAttendanceTiming(scheduledAt: string, now: Date): "allowed" | "too_early"`
- Adds status code: `too_early`

- [ ] **Step 1: 순수 서버 정책 실패 테스트 작성**

```ts
expect(getAttendanceTiming("2026-07-20T03:00:00.000Z", new Date("2026-07-20T02:59:59.999Z"))).toBe("too_early");
expect(getAttendanceTiming("2026-07-20T03:00:00.000Z", new Date("2026-07-20T03:00:00.000Z"))).toBe("allowed");
```

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/lib/appointments/attendance.test.ts`

Expected: 모듈이 없어 실패.

- [ ] **Step 3: 정책 helper와 Action 가드 구현**

```ts
export function getAttendanceTiming(scheduledAt: string, now: Date) {
  return hasAppointmentStarted(new Date(scheduledAt), now) ? "allowed" as const : "too_early" as const;
}
```

`confirmAttendance`, `confirmHostAttendance`, `markHostNoShow`는 상태를 변경하기 전에 약속을 조회하고 `too_early`면 `?status=too_early`로 리다이렉트한다. 업데이트는 기존 상태 조건과 `.select("id").maybeSingle()`을 사용해 경쟁 요청의 영향 행 0건을 성공으로 처리하지 않는다.

- [ ] **Step 4: GREEN 확인**

Run: `npm.cmd run test -- src/lib/appointments/attendance.test.ts src/lib/appointments/validation.test.ts`

Expected: 대상 테스트 전부 통과.

### Task 3: 관리자 원자 작업 마이그레이션

**Files:**
- Create: `supabase/migrations/0011_admin_atomic_operations.sql`
- Create: `src/lib/admin/migration-0011.test.ts`

**Interfaces:**
- Produces RPCs:
  - `admin_reset_employee_pin(p_admin_id uuid, p_employee_id uuid, p_pin_hash text) returns text`
  - `admin_set_employee_active(p_admin_id uuid, p_employee_id uuid, p_is_active boolean) returns text`
  - `admin_dismiss_report(p_admin_id uuid, p_report_id uuid) returns text`
  - `admin_delete_reported_review(p_admin_id uuid, p_report_id uuid) returns jsonb`
  - `admin_apply_csv_batch(p_admin_id uuid, p_batch_id uuid) returns jsonb`

- [ ] **Step 1: SQL 보안 계약 실패 테스트 작성**

테스트는 SQL 파일을 읽어 위 함수 이름, `security definer`, 빈 `search_path`, `revoke all ... from public`, `revoke all ... from anon`, `revoke all ... from authenticated`, `grant execute ... to service_role`을 확인한다.

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/lib/admin/migration-0011.test.ts`

Expected: `0011_admin_atomic_operations.sql`이 없어 실패.

- [ ] **Step 3: 직원·신고 RPC 구현**

각 함수는 `public.admins`에서 관리자 존재를 확인하고 대상 행을 `for update`로 잠근다. 대상이 없거나 이미 처리됐으면 안정된 상태 문자열을 반환한다. 변경과 아래 형식의 로그 삽입을 같은 함수 안에서 수행한다.

```sql
insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
values (p_admin_id, 'reset_employee_pin', 'employee', p_employee_id, null);
```

리뷰 삭제 함수는 `to_jsonb(review_row)`를 detail에 저장한 뒤 관련 신고와 리뷰를 삭제한다.

- [ ] **Step 4: CSV RPC 구현**

함수 시작 시 `pg_advisory_xact_lock(hashtextextended('admin_apply_csv_batch', 0))`을 호출하고 batch를 `for update`로 잠근다. `rows`의 `errors`가 빈 배열인 행만 처리한다. 메뉴는 `(restaurant_id, name)` 조회 후 update/insert, 영업시간은 `(restaurant_id, day_of_week)` upsert를 수행한다. 모든 행 반영 뒤 batch를 `applied`로 바꾸고 적용 건수를 감사 로그와 반환 JSON에 기록한다.

- [ ] **Step 5: GREEN 확인**

Run: `npm.cmd run test -- src/lib/admin/migration-0011.test.ts`

Expected: 보안 계약 테스트 통과.

### Task 4: 관리자 Action을 RPC로 전환

**Files:**
- Create: `src/lib/admin/rpc-result.ts`
- Create: `src/lib/admin/rpc-result.test.ts`
- Modify: `src/app/admin/(protected)/employees/actions.ts`
- Modify: `src/app/admin/(protected)/reports/actions.ts`
- Modify: `src/app/admin/(protected)/restaurants/import/actions.ts`
- Modify: `src/lib/admin/csv-batches.ts`

**Interfaces:**
- Produces: `parseAdminRpcStatus(value: unknown, allowed: readonly string[]): string`
- Produces: `parseCsvApplyRpcResult(value: unknown): { status: "applied" | "batch_not_found" | "already_applied" | "no_valid_rows"; type?: "menu" | "hours"; appliedCount?: number }`
- Consumes: Task 3 RPC names and result shapes.

- [ ] **Step 1: RPC 결과 검증 실패 테스트 작성**

```ts
expect(parseAdminRpcStatus("pin_reset", ["pin_reset", "target_not_found"])).toBe("pin_reset");
expect(() => parseAdminRpcStatus({ status: "pin_reset" }, ["pin_reset"])).toThrow();
expect(() => parseAdminRpcStatus("internal_error", ["pin_reset"])).toThrow();
expect(parseCsvApplyRpcResult({ status: "applied", type: "menu", appliedCount: 2 })).toEqual({
  status: "applied",
  type: "menu",
  appliedCount: 2,
});
```

- [ ] **Step 2: RED 확인**

Run: `npm.cmd run test -- src/lib/admin/rpc-result.test.ts`

Expected: helper 모듈이 없어 실패.

- [ ] **Step 3: 결과 helper와 직원·신고 Action 전환**

각 Action은 기존 인증·UUID·PIN 검증 뒤 `supabase.rpc`를 한 번 호출한다. RPC error는 일반화된 서버 오류로 바꾸고 반환 상태만 허용 목록 리다이렉트에 사용한다. 직접 테이블 update/delete, 세션 폐기, `logAdminAction` 호출을 제거한다.

- [ ] **Step 4: CSV Action 전환**

`getCsvBatch`의 Zod 재검증과 유효 행 사전 확인은 유지한다. 행별 쓰기, `markCsvBatchApplied`, `logAdminAction`을 제거하고 `admin_apply_csv_batch` RPC 한 번으로 교체한다. 반환 가능한 상태는 `applied`, `batch_not_found`, `already_applied`, `no_valid_rows`로 제한한다.

- [ ] **Step 5: GREEN 확인**

Run: `npm.cmd run test -- src/lib/admin/rpc-result.test.ts src/lib/admin/validation.test.ts`

Expected: 대상 테스트 전부 통과.

### Task 5: 문서와 원격 DB 적용 전 검사

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-20-stage-13c-atomic-admin-and-time.md`

- [ ] **Step 1: README 갱신**

마이그레이션 범위를 `0001`~`0011`로 바꾸고 관리자 원자 작업 및 확정된 방문 확인 시간 정책을 현재 기능에 반영한다.

- [ ] **Step 2: 원격 읽기 전용 사전검사**

원격 `0010` 구조, 동일 식당·메뉴명 중복, pending CSV batch, pending report FK, 직원·세션 FK, 기존 0011 함수 이름 충돌을 조회한다. 결과에는 비밀값과 초대 코드 원문을 출력하지 않는다.

- [ ] **Step 3: 원격 적용 승인 요청**

사용자에게 `0011` SQL 해시, 생성 함수 5개, 권한 변경, 데이터 행을 직접 수정하지 않는다는 점과 사전검사 결과를 제시한다. 승인 전에는 원격 SQL을 실행하지 않는다.

- [ ] **Step 4: 승인 후 적용·대조**

승인을 받은 경우에만 `0011`을 원격 DB에 적용하고 함수 정의·소유자·실행 권한을 로컬 SQL과 대조한다. 운영 데이터 쓰기 테스트는 수행하지 않는다.

### Task 6: 전체 검증과 인계

**Files:**
- Modify: `docs/superpowers/plans/2026-07-20-stage-13c-atomic-admin-and-time.md`

- [ ] **Step 1: 전체 자동 검증**

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
git diff --check
```

Expected: 모두 exit code 0, Vitest 실패 0건, Next.js build 성공.

- [ ] **Step 2: 선택 검증 보고**

`.env.test.local`이 안전한 별도 테스트 DB로 구성된 경우에만 `npm.cmd run test:integration`과 `npm.cmd run test:e2e`를 실행한다. 환경이 없으면 미실행으로 보고한다.

- [ ] **Step 3: 최종 상태 보고**

변경·추가 파일, `0011` 로컬/원격 일치 여부, RPC 권한, 방문 확인 시간 정책, 테스트 결과, Git status, 미커밋/커밋 여부와 남은 범위를 보고한다. Git push는 수행하지 않는다.
