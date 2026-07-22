# 공개 동행 모집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 방장이 정원을 정한 공개 동행을 만들고, 직원 신청을 승인·거절할 수 있게 한다.

**Architecture:** `appointments`에 공개 여부와 정원을 저장한다. 기존 `appointment_participants`의 `pending` 행을 공개 신청에도 사용하고, 서버 액션이 방장·약속 상태·정원을 재검증한다. 홈은 현재 직원이 신청 가능한 공개 동행만 별도로 조회해 표시한다.

**Tech Stack:** Next.js App Router Server Actions, TypeScript, Tailwind CSS, Supabase PostgreSQL, Vitest.

## Global Constraints

- 공개 정원은 방장을 포함해 2~10명, 기본값 4명이다.
- 비공개 동행은 기존 초대 흐름과 데이터 의미를 유지한다.
- 서버 액션에서 직원 세션, 활성·미래 약속, 방장 권한, 중복 신청, 정원을 검증한다.
- 자동 승인, 대기열 승격, 댓글·채팅, 정원 변경 후 자동 조정은 구현하지 않는다.
- 완료 전 `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`를 실행한다.

---

### Task 1: 공개 모집 데이터와 순수 검증

**Files:**
- Create: `supabase/migrations/0034_public_appointment_recruitment.sql`
- Modify: `src/lib/appointments/validation.ts`
- Modify: `src/lib/appointments/validation.test.ts`
- Create: `src/lib/appointments/migration-0034.test.ts`

**Interfaces:**
- Produces `PUBLIC_APPOINTMENT_CAPACITY_DEFAULT = 4`, `PUBLIC_APPOINTMENT_CAPACITY_MIN = 2`, `PUBLIC_APPOINTMENT_CAPACITY_MAX = 10`, `parsePublicAppointmentInput(FormData)`.
- `parsePublicAppointmentInput` returns `{ isPublic: false, capacity: null }` or `{ isPublic: true, capacity: number }`.

- [ ] **Step 1: Write failing validation and migration tests.**

```ts
expect(parsePublicAppointmentInput(new FormData())).toEqual({ isPublic: false, capacity: null });
expect(parsePublicAppointmentInput(formData("isPublic", "on", "capacity", "4"))).toEqual({ isPublic: true, capacity: 4 });
expect(parsePublicAppointmentInput(formData("isPublic", "on", "capacity", "11"))).toBeNull();
expect(sql).toMatch(/is_public boolean not null default false/i);
expect(sql).toMatch(/capacity smallint/i);
```

- [ ] **Step 2: Run the focused tests and confirm they fail.**

Run: `npm.cmd test -- src/lib/appointments/validation.test.ts src/lib/appointments/migration-0034.test.ts`

Expected: failure because the parser and migration do not exist.

- [ ] **Step 3: Add the migration and parser.**

```sql
alter table appointments add column is_public boolean not null default false;
alter table appointments add column capacity smallint;
alter table appointments add constraint appointments_public_capacity_check check (
  (is_public = false and capacity is null) or (is_public = true and capacity between 2 and 10)
);
create index appointments_public_recruitment_idx on appointments (scheduled_at)
  where is_public = true and status = 'active';

create function approve_public_appointment_applicant(p_appointment_id uuid, p_participant_id uuid)
returns boolean
language plpgsql
as $$
-- Lock the appointment, check host-inclusive accepted count, and transition only a pending applicant.
$$;
```

Use a strict integer parser for `capacity`; unchecked `isPublic` always yields `capacity: null`.

- [ ] **Step 4: Run focused tests and commit.**

Run: `npm.cmd test -- src/lib/appointments/validation.test.ts src/lib/appointments/migration-0034.test.ts`

Expected: PASS.

Commit: `git commit -am "feat: add public appointment capacity"`

### Task 2: 공개 약속 조회와 신청·승인 서버 액션

**Files:**
- Modify: `src/lib/appointments/queries.ts`
- Modify: `src/app/appointments/new/actions.ts`
- Modify: `src/app/appointments/[id]/actions.ts`
- Modify: `src/lib/appointments/validation.ts`
- Modify: `src/lib/notifications/validation.ts`
- Modify: `src/lib/notifications/validation.test.ts`

**Interfaces:**
- Produces `getPublicRecruitingAppointments(employeeId, now): Promise<PublicRecruitingAppointment[]>`.
- Produces `applyToPublicAppointment(appointmentId)` and `decidePublicApplicant(appointmentId, participantId, decision)` where decision is `"accepted" | "declined"`.
- Extends `AppointmentDetail` with `isPublic` and `capacity`.

- [ ] **Step 1: Write failing pure tests for capacity and notification copy.**

```ts
expect(canAcceptPublicApplicant({ capacity: 4, acceptedParticipantCount: 2 })).toBe(true);
expect(canAcceptPublicApplicant({ capacity: 4, acceptedParticipantCount: 3 })).toBe(false);
expect(buildPublicAppointmentApplicationMessage("복만당")).toContain("참여 신청");
```

- [ ] **Step 2: Run the focused tests and confirm they fail.**

Run: `npm.cmd test -- src/lib/appointments/validation.test.ts src/lib/notifications/validation.test.ts`

Expected: failure because capacity helpers and messages do not exist.

- [ ] **Step 3: Implement queries and actions.**

`getPublicRecruitingAppointments` selects only active, future, public appointments; excludes the host and current employee rows that already exist; counts accepted rows and returns only appointments where `1 + acceptedCount < capacity`.

```ts
export function canAcceptPublicApplicant(input: { capacity: number; acceptedParticipantCount: number }) {
  return input.acceptedParticipantCount + 1 < input.capacity;
}
```

`applyToPublicAppointment` must reject non-public, expired, cancelled, self, duplicate, and full appointments, then insert `pending` and notify the host. `decidePublicApplicant` must require the host and pending row. A decline updates only that pending row; an approval calls `approve_public_appointment_applicant`, which locks the appointment row, counts accepted participants with the host included, verifies remaining capacity, and updates only the requested pending row in one transaction. Notify the applicant for either decision. `createAppointment` persists the parsed public fields and does not create nickname invitations for public appointments.

- [ ] **Step 4: Run focused tests and commit.**

Run: `npm.cmd test -- src/lib/appointments/validation.test.ts src/lib/notifications/validation.test.ts`

Expected: PASS.

Commit: `git commit -am "feat: add public appointment applications"`

### Task 3: 생성·상세·홈 화면

**Files:**
- Modify: `src/app/appointments/new/page.tsx`
- Modify: `src/app/appointments/[id]/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/appointments/new/page.test.tsx`

**Interfaces:**
- Consumes `getPublicRecruitingAppointments`, `applyToPublicAppointment`, `decidePublicApplicant`, `AppointmentDetail.isPublic`, and `AppointmentDetail.capacity`.

- [ ] **Step 1: Write failing UI tests.**

```tsx
expect(screen.getByLabelText("공개 모집")).toBeInTheDocument();
expect(screen.getByLabelText("정원")).toHaveValue(4);
expect(screen.getByRole("heading", { name: "참여 가능한 동행" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "참여 신청" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "승인" })).toBeInTheDocument();
```

- [ ] **Step 2: Run UI tests and confirm they fail.**

Run: `npm.cmd test -- src/app/appointments/new/page.test.tsx src/app/page.test.tsx`

Expected: failure because the form controls, recruitment list, and host controls do not exist.

- [ ] **Step 3: Implement the forms and lists.**

Add an unchecked `isPublic` checkbox to the creation form. Show a `capacity` number input defaulting to 4 when it is selected and keep direct nickname invitations hidden for public appointments. In the appointment detail, show public/정원 metadata; hosts see each pending applicant with approval and rejection forms, while eligible employees see a single 참여 신청 form. In the home page, query recruitment rows in parallel with existing home data and render a compact `참여 가능한 동행` section only when it has rows.

- [ ] **Step 4: Run UI tests and commit.**

Run: `npm.cmd test -- src/app/appointments/new/page.test.tsx src/app/page.test.tsx`

Expected: PASS.

Commit: `git commit -am "feat: add public appointment recruitment UI"`

### Task 4: Full verification

**Files:**
- Modify only files required by fixes discovered in this task.

- [ ] **Step 1: Run static checks.**

Run: `npm.cmd run lint; npm.cmd run typecheck`

Expected: both commands exit 0.

- [ ] **Step 2: Run the full test suite.**

Run: `npm.cmd test`

Expected: all test files pass.

- [ ] **Step 3: Run a production build.**

Run: `npm.cmd run build`

Expected: Next.js production build exits 0.

- [ ] **Step 4: Check the final diff and commit verification fixes.**

Run: `git diff --check; git status --short`

Expected: no whitespace errors and only intentional files changed.

Commit, if fixes are needed: `git commit -am "fix: verify public appointment recruitment"`
