# 투표 동점 해결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 방장이 공동 1위 동점을 무작위·최단거리·최근 덜 방문 기준으로 확정하게 한다.

**Architecture:** 순수 동점 선택 함수는 `src/lib/polls/tie-resolution.ts`에 둔다. poll action은 현재 결과를 조회해 공동 1위만 자동 확정하고, 기존 확정·알림 저장을 공통화한다. poll detail은 closed 상태의 방장에게 자동 해결 버튼을 노출한다.

### Task 1: 순수 동점 선택 로직

**Files:** Create `src/lib/polls/tie-resolution.ts`, `src/lib/polls/tie-resolution.test.ts`.

- [ ] 실패 테스트로 공동 1위 외 옵션 배제, 최단거리, 최소 방문 수, position 동률 해소를 작성한다.
- [ ] `chooseTiedOption`을 구현하고 `npm.cmd test -- src/lib/polls/tie-resolution.test.ts`를 통과시킨다.

### Task 2: 자동 확정 Server Action

**Files:** Modify `src/app/polls/[id]/actions.ts`; add action tests if existing action test fixture is available.

- [ ] 자동 방식과 공동 1위가 아닌 옵션을 거절하는 실패 테스트를 작성한다.
- [ ] closed·creator 검증, 식당 좌표·회사 좌표·완료 방문 수 조회, 기존 decide 알림 재사용을 구현한다.

### Task 3: 동점 해결 UI

**Files:** Modify `src/app/polls/[id]/page.tsx` and its test.

- [ ] closed 공동 1위 식당 투표에서 세 자동 버튼, 메뉴 투표에서 무작위 버튼만 보이는 실패 테스트를 작성한다.
- [ ] 방장 전용 `결정 못 하겠어요?` 영역과 action forms를 구현한다.

### Task 4: 검증

- [ ] `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`를 실행한다.
