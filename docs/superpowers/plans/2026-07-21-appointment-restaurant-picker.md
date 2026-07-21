# 함께 먹기 식당 선택 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/appointments/new` 직접 접근 시 404 대신 활성 식당 선택 화면을 제공하고 기존 식당 지정 약속 생성 흐름을 유지한다.

**Architecture:** `NewAppointmentPage`가 먼저 인증을 확인한 뒤 `restaurantId` 유무에 따라 두 상태를 렌더링한다. 미지정 상태는 활성 식당을 이름순으로 조회해 선택 링크를 제공하고, 지정 상태는 현재 조회·검증·Server Action 흐름을 그대로 사용한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Supabase, Tailwind CSS 4, Vitest, Testing Library

## Global Constraints

- 약속 생성 Server Action, 데이터베이스 스키마, 참여자 처리 방식을 변경하지 않는다.
- 기존 `restaurantId`, `status`, `fromPollId` 쿼리 이름과 지정 식당 검증을 유지한다.
- 비로그인 사용자의 안전한 `returnTo` 경로를 보존한다.
- 공유 UI 컴포넌트를 재사용하고 선택 링크의 최소 클릭 영역을 44px로 유지한다.

---

### Task 1: 식당 미지정 함께 먹기 화면

**Files:**
- Create: `src/app/appointments/new/page.test.tsx`
- Modify: `src/app/appointments/new/page.tsx`

**Interfaces:**
- Consumes: `getCurrentEmployee()`, `createServiceRoleClient()`, `Card`, `Badge`, `FeedbackState`, `buttonStyles`
- Preserves: `createAppointment.bind(null, restaurant.id)`, `restaurantId`, `status`, `fromPollId`

- [ ] **Step 1: 미지정 식당 회귀 테스트 작성**

`src/app/appointments/new/page.test.tsx`에서 인증·Supabase·Next 내비게이션을 모킹하고 Server Component를 `await NewAppointmentPage(...)`로 렌더링한다. 다음 계약을 테스트한다.

```tsx
it("shows active restaurants instead of returning 404 when no restaurant is selected", async () => {
  mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
  mocks.order.mockResolvedValue({
    data: [
      { id: "r1", name: "점심식당", category: "한식" },
      { id: "r2", name: "면가", category: "중식" },
    ],
  });

  render(await NewAppointmentPage({ searchParams: Promise.resolve({}) }));

  expect(screen.getByRole("heading", { name: "함께 먹기" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /점심식당/ })).toHaveAttribute(
    "href",
    "/appointments/new?restaurantId=r1",
  );
  expect(mocks.notFound).not.toHaveBeenCalled();
});

it("shows an empty state that links to the restaurant directory", async () => {
  mocks.maybeEmployee.mockResolvedValue({ id: "employee-1" });
  mocks.order.mockResolvedValue({ data: [] });

  render(await NewAppointmentPage({ searchParams: Promise.resolve({}) }));

  expect(screen.getByText("선택할 수 있는 식당이 없어요")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "식당 둘러보기" })).toHaveAttribute(
    "href",
    "/restaurants",
  );
});
```

비로그인 미지정 접근이 `redirect("/login?returnTo=%2Fappointments%2Fnew")`를 호출하고, 지정 식당 접근이 기존 생성 폼을 렌더링하는 테스트도 포함한다.

- [ ] **Step 2: 테스트가 현재 404 동작으로 실패하는지 확인**

Run: `npm.cmd run test -- src/app/appointments/new/page.test.tsx`

Expected: FAIL because the page calls `notFound()` before rendering a picker when `restaurantId` is absent.

- [ ] **Step 3: 인증 우선 분기와 선택 화면 구현**

`src/app/appointments/new/page.tsx`에서 인증 확인을 `restaurantId` 검사보다 앞으로 이동한다. `restaurantId`가 없으면 다음 조회를 수행한다.

```ts
const { data: restaurants } = await supabase
  .from("restaurants")
  .select("id, name, category")
  .eq("is_active", true)
  .order("name", { ascending: true });
```

조회 결과가 있으면 `Card` 목록 안에 다음 링크를 렌더링한다.

```tsx
<Link
  href={`/appointments/new?restaurantId=${restaurant.id}`}
  className={buttonStyles({ variant: "secondary", block: true })}
>
  <span>{restaurant.name}</span>
  <Badge>{restaurant.category}</Badge>
</Link>
```

조회 결과가 없으면 다음 빈 상태를 렌더링한다.

```tsx
<FeedbackState
  title="선택할 수 있는 식당이 없어요"
  description="식당 목록을 확인하거나 관리자에게 활성 식당 등록을 요청해 주세요."
  action={<Link href="/restaurants">식당 둘러보기</Link>}
/>
```

`restaurantId`가 있는 분기는 기존 단일 식당 조회, `notFound()`, 피드백, `createAppointment` 폼을 그대로 유지한다.

- [ ] **Step 4: 집중 테스트와 정적 검증 실행**

Run: `npm.cmd run test -- src/app/appointments/new/page.test.tsx src/components/layout/layout.test.tsx`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 5: 전체 검증과 브라우저 재현 확인**

Run: `npm.cmd run test`

Expected: all Vitest suites PASS.

Run: `npm.cmd run lint`

Expected: exit code 0.

Run: `npm.cmd run build`

Expected: `/appointments/new` compiles successfully.

브라우저에서 `http://localhost:3000/appointments/new`를 다시 열어 404가 사라지고 `함께 먹기` 제목과 식당 선택 상태가 표시되는지 확인한다.

- [ ] **Step 6: 커밋**

```powershell
git add src/app/appointments/new/page.tsx src/app/appointments/new/page.test.tsx
git commit -m "fix: show restaurant picker for appointments"
```
