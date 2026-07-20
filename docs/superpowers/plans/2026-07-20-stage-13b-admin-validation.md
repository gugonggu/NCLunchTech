# Stage 13-B Admin Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 입력, 저장 JSON, Supabase 결과를 검증하고 예상 가능한 실패를 관리자 화면에 안전하게 표시한다.

**Architecture:** 순수 Zod 검증 모듈과 Supabase 결과 helper를 만들고 각 Server Action이 이를 사용한다. 화면은 기존 query status 패턴을 확장하며 트랜잭션은 후속 단계로 남긴다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod 4, Supabase JS, Vitest

## Global Constraints

- DB 마이그레이션과 RPC를 추가하지 않는다.
- 초대 코드는 4~64자, 공지는 200자 이하, 기본 반경은 300·500·800·1200·2000만 허용한다.
- CSV는 2 MiB와 데이터 5,000행을 초과할 수 없으며 UTF-8 손상 문자를 거부한다.
- 내부 DB 오류와 비밀값을 사용자 또는 로그에 노출하지 않는다.
- 13-C 원자성 작업과 방문·약속 시간 검증을 포함하지 않는다.

---

### Task 1: 검증 경계

**Files:**
- Create: `src/lib/admin/validation.ts`
- Create: `src/lib/admin/validation.test.ts`
- Modify: `src/lib/admin/csv-parse.ts`
- Modify: `src/lib/admin/csv-parse.test.ts`

**Interfaces:**
- Produces: UUID·설정·이력·CSV batch Zod schemas, `validateCsvUpload(file)`

- [ ] 실패 테스트에 잘못된 UUID, 제한값, 변조 snapshot, 대용량·손상 CSV 사례를 작성한다.
- [ ] `npm.cmd run test -- src/lib/admin/validation.test.ts src/lib/admin/csv-parse.test.ts`가 기대한 이유로 실패하는지 확인한다.
- [ ] 최소 스키마와 CSV 형식 검사를 구현한다.
- [ ] 같은 테스트가 통과하는지 확인한다.

### Task 2: Supabase 결과와 감사 로그

**Files:**
- Create: `src/lib/admin/db-result.ts`
- Create: `src/lib/admin/db-result.test.ts`
- Modify: `src/lib/auth/admin-log.ts`
- Modify: `src/lib/admin/csv-batches.ts`

**Interfaces:**
- Produces: `requireQueryData`, `requireAffectedRow`, `requireQuerySuccess`

- [ ] 오류·null·영향 행 0건에 대한 실패 테스트를 작성한다.
- [ ] 테스트가 helper 부재로 실패하는지 확인한다.
- [ ] helper를 구현하고 관리자 로그·CSV batch 함수에서 사용한다.
- [ ] 대상 테스트를 통과시킨다.

### Task 3: 관리자 Action 검증

**Files:**
- Modify: `src/app/admin/(protected)/employees/actions.ts`
- Modify: `src/app/admin/(protected)/reports/actions.ts`
- Modify: `src/app/admin/(protected)/restaurants/[id]/actions.ts`
- Modify: `src/app/admin/(protected)/settings/actions.ts`

**Interfaces:**
- Consumes: Task 1 schemas, Task 2 result helpers
- Produces: 검증된 Action과 안정된 status redirect

- [ ] 각 Action의 UUID·대상 관계·설정값·snapshot 실패 사례를 검증 helper 테스트에 추가한다.
- [ ] 실패를 확인하고 Action이 검증된 값만 사용하도록 수정한다.
- [ ] Supabase 오류와 영향 행 0건을 검사한다.
- [ ] 관련 단위 테스트를 통과시킨다.

### Task 4: CSV 업로드·적용 오류 처리

**Files:**
- Modify: `src/app/admin/(protected)/restaurants/import/actions.ts`
- Modify: `src/lib/admin/csv-batches.ts`
- Modify: `src/lib/admin/csv-messages.ts`
- Modify: `src/lib/admin/csv-menu.ts`
- Modify: `src/lib/admin/csv-hours.ts`

**Interfaces:**
- Consumes: `validateCsvUpload`, CSV batch schemas, DB result helpers

- [ ] 파일 제한과 변조 batch 테스트를 먼저 실패시킨다.
- [ ] 업로드 전 제한, 적용 전 JSON 재검증, 행별 DB 오류와 batch 상태 오류 확인을 구현한다.
- [ ] CSV 단위 테스트를 통과시킨다.

### Task 5: 사용자 상태 메시지와 최종 검증

**Files:**
- Modify: 관리자 직원·신고·식당 상세·설정·CSV 페이지
- Modify: `README.md`

**Interfaces:**
- Consumes: 안정된 status code

- [ ] 허용된 status만 메시지로 바꾸는 순수 map 검증을 추가한다.
- [ ] 각 페이지에 성공·실패 메시지를 표시한다.
- [ ] `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`를 실행한다.
- [ ] diff와 Git 상태를 검토하고 13-C 잔여 위험을 README와 완료 보고에 남긴다.
