# UI·UX Redesign Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 기능과 데이터 계약을 유지하면서 디자인 시스템, 반응형 앱 셸, 인증 화면, 홈과 즉시 추천 흐름을 완성도 높은 모바일 중심 UI로 재구성한다.

**Architecture:** 기존 Server Component와 Server Action은 데이터 조회·상태 판정·저장을 계속 담당한다. 재사용 가능한 시각 규칙은 `src/components/ui`, 반응형 셸은 `src/components/layout`, 점심 도메인 표시는 `src/components/lunch`로 분리하고 페이지는 이들을 조합한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4, Vitest, Testing Library, Playwright

## Global Constraints

- DB 스키마, Supabase 테이블, RLS, 인증, 추천 알고리즘과 API 응답 구조를 변경하지 않는다.
- 기존 URL, 쿼리 파라미터, 폼 필드명, Server Action 입력 계약을 유지한다.
- 새 UI, 아이콘 또는 애니메이션 패키지를 추가하지 않는다.
- 색상은 Primary `#F47C20`, Primary hover `#D9600B`, Primary soft `#FFF0E2`, Background `#FBF8F4`, Surface `#FFFFFF`, Surface muted `#F5F1EC`, Text primary `#292521`, Text secondary `#6F6861`, Border `#E8E1D9`를 사용한다.
- 기본 간격은 4px 단위, 모바일 좌우 여백은 20px, 데스크톱 좌우 여백은 32px로 한다.
- 기본 버튼은 48px, 압축 버튼은 40px, 입력은 최소 48px, 카드 radius는 20px, 버튼·입력 radius는 14px로 한다.
- 클릭 영역은 최소 44px로 하고 포커스 표시, 키보드 탐색, `prefers-reduced-motion`을 보장한다.
- 실제 브라우저 검증은 `360`, `390`, `430`, `768`, `1280`, `1440px`에서 수행한다.
- Node.js는 `.nvmrc`의 `22.23.1`을 우선 사용하고 최소 `20.19.0` 이상을 사용한다.

---

## File Map

- `src/app/globals.css`: Tailwind theme 변수, 기본 본문, 포커스, reduced-motion 규칙
- `src/components/ui/cx.ts`: 조건부 className 결합
- `src/components/ui/Button.tsx`: 링크와 버튼이 공유하는 제한된 variant
- `src/components/ui/Card.tsx`: surface·outlined·accent 카드
- `src/components/ui/Badge.tsx`: neutral·success·warning·danger·info 상태 배지
- `src/components/ui/FormField.tsx`: label, control, hint, error 연결
- `src/components/ui/FeedbackState.tsx`: 빈 상태와 오류 상태
- `src/components/ui/Skeleton.tsx`: 로딩 자리 표시자
- `src/components/ui/ui.test.tsx`: 공통 UI 의미·variant·접근성 테스트
- `src/components/icons/AppIcon.tsx`: 외부 패키지 없는 공통 SVG 아이콘
- `src/components/layout/AppShell.tsx`: 인증 사용자용 반응형 컨테이너
- `src/components/layout/AppNavigation.tsx`: 모바일 하단·데스크톱 상단 내비게이션
- `src/components/layout/AuthShell.tsx`: 로그인·회원가입 전용 레이아웃
- `src/components/layout/layout.test.tsx`: 내비게이션 항목과 현재 경로 테스트
- `src/app/layout.tsx`: 로그인 여부에 따라 셸과 내비게이션 조합
- `src/app/BottomNavigation.tsx`: 제거
- `src/app/loading.tsx`: 전역 페이지 Skeleton
- `src/app/error.tsx`: 사용자용 오류 경계와 재시도
- `src/app/login/page.tsx`: label·오류·제출 상태를 갖춘 로그인 화면
- `src/app/signup/page.tsx`: 같은 인증 셸과 필드 규칙을 사용하는 회원가입 화면
- `src/app/login/page.test.tsx`: 로그인 의미 구조와 기존 반환 경로 테스트
- `src/app/signup/page.test.tsx`: 회원가입 label과 제출 상태 테스트
- `src/components/lunch/home-state.ts`: 홈 Hero 상태 우선순위 순수 함수
- `src/components/lunch/HomeHero.tsx`: 확인·결정·추천·후속 행동 Hero
- `src/components/lunch/TodayTimeline.tsx`: 투표와 약속 보조 목록
- `src/components/lunch/home-state.test.ts`: 홈 우선순위 테스트
- `src/app/page.tsx`: 기존 조회를 유지하고 새 홈 컴포넌트 조합
- `src/app/page.test.tsx`: 새 의미 구조와 기존 액션·링크 회귀 테스트
- `src/lib/review-photos/queries.ts`: 식당별 대표 사진 조회 추가
- `src/components/lunch/RestaurantVisual.tsx`: 사진과 카테고리 fallback
- `src/components/lunch/RecommendationCard.tsx`: 메인·대안 추천 카드
- `src/components/lunch/RecommendationCard.test.tsx`: CTA 우선순위와 fallback 테스트
- `src/app/recommend/RecommendationFilters.tsx`: 기존 GET 필드 전체를 보존한 필터 폼
- `src/app/recommend/ResponsiveFilterPanel.tsx`: 모바일 Bottom Sheet와 데스크톱 패널
- `src/app/recommend/ResponsiveFilterPanel.test.tsx`: 열기·닫기·Escape·포커스 복귀 테스트
- `src/app/recommend/page.tsx`: 기존 추천 계산을 유지하고 표시 구조만 교체
- `src/app/recommend/RecommendMapView.tsx`: 새 surface와 반응형 크기 적용
- `src/app/recommend/loading.tsx`: 추천 결과 Skeleton
- `tests/e2e/auth-flow.spec.ts`: 새 내비게이션과 로그아웃 위치에 맞춘 기존 흐름
- `tests/e2e/ui-responsive.spec.ts`: 공개 화면 breakpoint·가로 스크롤 검사

---

### Task 1: Design tokens and UI primitives

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/ui/cx.ts`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/FormField.tsx`
- Create: `src/components/ui/FeedbackState.tsx`
- Create: `src/components/ui/Skeleton.tsx`
- Create: `src/components/ui/ui.test.tsx`

**Interfaces:**
- Produces: `cx(...values: Array<string | false | null | undefined>): string`
- Produces: `buttonStyles({ variant, size, block }): string`
- Produces: `Button`, `Card`, `Badge`, `FormField`, `FeedbackState`, `Skeleton`

- [ ] **Step 1: Write failing component tests**

```tsx
// src/components/ui/ui.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { FeedbackState } from "./FeedbackState";
import { FormField } from "./FormField";

describe("shared UI", () => {
  it("exposes button variants without losing native attributes", () => {
    render(<Button variant="primary" disabled>저장 중</Button>);
    expect(screen.getByRole("button", { name: "저장 중" })).toBeDisabled();
  });

  it("connects labels, hints and errors to fields", () => {
    render(
      <FormField label="닉네임" htmlFor="nickname" hint="사내에서 사용할 이름" error="닉네임을 입력해주세요.">
        <input id="nickname" aria-invalid="true" />
      </FormField>
    );
    const input = screen.getByLabelText("닉네임");
    expect(input).toHaveAttribute("aria-describedby", "nickname-hint nickname-error");
  });

  it("renders semantic status and actionable empty states", () => {
    render(<><Badge tone="success">영업 중</Badge><FeedbackState title="방문 기록이 없어요" action={<a href="/recommend">추천 받기</a>} /></>);
    expect(screen.getByText("영업 중")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "추천 받기" })).toHaveAttribute("href", "/recommend");
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing modules fail**

Run: `npm.cmd run test -- src/components/ui/ui.test.tsx`

Expected: FAIL because `Badge`, `Button`, `FeedbackState`, and `FormField` do not exist.

- [ ] **Step 3: Add theme tokens and base interaction rules**

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand: #f47c20;
  --color-brand-dark: #d9600b;
  --color-brand-soft: #fff0e2;
  --color-canvas: #fbf8f4;
  --color-surface: #ffffff;
  --color-surface-muted: #f5f1ec;
  --color-ink: #292521;
  --color-ink-muted: #6f6861;
  --color-line: #e8e1d9;
  --color-success: #287a4b;
  --color-success-soft: #e8f5ed;
  --color-warning: #996515;
  --color-warning-soft: #fff5d9;
  --color-danger: #b33a34;
  --color-danger-soft: #fdecea;
  --color-info: #326aa8;
  --color-info-soft: #eaf2fb;
  --radius-control: 0.875rem;
  --radius-card: 1.25rem;
  --shadow-card: 0 8px 28px rgb(69 52 37 / 0.07);
  --shadow-float: 0 18px 50px rgb(69 52 37 / 0.14);
}

html { background: var(--color-canvas); }
body {
  min-width: 320px;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif;
}
:where(a, button, input, select, textarea, summary):focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-brand) 38%, transparent);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 4: Implement the primitives with fixed variants**

```ts
// src/components/ui/cx.ts
export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
```

```tsx
// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "default" | "compact";

export function buttonStyles({ variant = "primary", size = "default", block = false }: { variant?: Variant; size?: Size; block?: boolean } = {}) {
  return cx(
    "inline-flex min-w-0 items-center justify-center gap-2 rounded-control px-4 font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
    size === "default" ? "min-h-12 text-sm" : "min-h-10 text-sm",
    variant === "primary" && "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark",
    variant === "secondary" && "border border-line bg-surface text-ink hover:bg-surface-muted",
    variant === "ghost" && "bg-transparent text-ink-muted hover:bg-brand-soft hover:text-brand-dark",
    variant === "danger" && "bg-danger-soft text-danger hover:bg-red-100",
    block && "w-full"
  );
}

export function Button({ className, variant, size, block, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; block?: boolean }) {
  return <button className={cx(buttonStyles({ variant, size, block }), className)} {...props} />;
}
```

Implement `Card`, `Badge`, `FormField`, `FeedbackState`, and `Skeleton` with these exact public props:

```tsx
export function Card(props: React.HTMLAttributes<HTMLDivElement> & { tone?: "surface" | "muted" | "accent"; padding?: "none" | "compact" | "default" }): React.ReactElement;
export function Badge(props: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }): React.ReactElement;
export function FormField(props: { label: string; htmlFor: string; hint?: string; error?: string | null; children: React.ReactElement<{ "aria-describedby"?: string }> }): React.ReactElement;
export function FeedbackState(props: { title: string; description?: string; action?: React.ReactNode; tone?: "empty" | "error" }): React.ReactElement;
export function Skeleton(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
```

`FormField` must clone its only child and append `${htmlFor}-hint` and `${htmlFor}-error` to any existing `aria-describedby`. `FeedbackState` with `tone="error"` must use `role="alert"`. `Skeleton` must set `aria-hidden="true"` and `animate-pulse motion-reduce:animate-none`.

- [ ] **Step 5: Run the focused tests**

Run: `npm.cmd run test -- src/components/ui/ui.test.tsx`

Expected: PASS with 3 tests.

- [ ] **Step 6: Commit the design foundation**

```powershell
git add src/app/globals.css src/components/ui
git commit -m "feat: add lunch app design foundations"
```

---

### Task 2: Responsive app shell, navigation, loading and error states

**Files:**
- Create: `src/components/icons/AppIcon.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/AppNavigation.tsx`
- Create: `src/components/layout/AuthShell.tsx`
- Create: `src/components/layout/layout.test.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `src/app/BottomNavigation.tsx`
- Create: `src/app/loading.tsx`
- Create: `src/app/error.tsx`

**Interfaces:**
- Consumes: `cx`, `buttonStyles`, `Card`, `FeedbackState`, `Skeleton`
- Produces: `AppIcon({ name, className })`, `AppShell`, `AppNavigation`, `AuthShell`

- [ ] **Step 1: Write navigation tests**

```tsx
// src/components/layout/layout.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNavigation } from "./AppNavigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/notifications" }));

describe("AppNavigation", () => {
  it("shows the five core destinations and marks the active item", () => {
    render(<AppNavigation />);
    for (const label of ["홈", "식당", "함께 먹기", "알림", "내 정보"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
    for (const link of screen.getAllByRole("link", { name: "알림" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npm.cmd run test -- src/components/layout/layout.test.tsx`

Expected: FAIL because `AppNavigation` does not exist.

- [ ] **Step 3: Implement internal SVG icons and both navigation variants**

```tsx
// src/components/icons/AppIcon.tsx
import type { SVGProps } from "react";

export type AppIconName = "home" | "restaurant" | "people" | "bell" | "profile" | "arrow" | "spark" | "map" | "check" | "refresh";

export function AppIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: AppIconName }) {
  const paths: Record<AppIconName, React.ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3Z" />,
    restaurant: <><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M16 3v18M16 3c3 2 4 5 4 8h-4" /></>,
    people: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M15 15a5 5 0 0 1 6 4.8V21" /></>,
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    spark: <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z" />,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5M6.1 7a8 8 0 0 1 13.2 3M17.9 17A8 8 0 0 1 4.7 14" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
```

`AppNavigation` must render the same `NAV_ITEMS` twice: a `md:hidden` fixed bottom navigation and a `hidden md:flex` desktop header. Use these exact destinations:

```ts
export const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/restaurants", label: "식당", icon: "restaurant" },
  { href: "/appointments/new", label: "함께 먹기", icon: "people" },
  { href: "/notifications", label: "알림", icon: "bell" },
  { href: "/me", label: "내 정보", icon: "profile" },
] as const;
```

Return `null` from `AppNavigation` when the pathname starts with `/admin` or equals `/login` or `/signup`, preserving the current navigation exclusions.

`AppShell` must reserve `pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0`, render the desktop header above a centered `max-w-7xl`, and never apply `max-w-md` globally. `AuthShell` must render a one-column mobile layout and a two-column `lg:grid-cols-[0.9fr_1.1fr]` desktop layout.

- [ ] **Step 4: Wire the root layout and add resilient route states**

```tsx
// src/app/layout.tsx body structure
<body className="antialiased">
  {employee ? <AppShell>{children}</AppShell> : children}
</body>
```

`src/app/loading.tsx` must render a page container with one title Skeleton, one large card Skeleton and three row Skeletons. `src/app/error.tsx` must be a client component that renders `FeedbackState tone="error"`, calls the supplied `reset()` from a `다시 시도` button, and never prints `error.message`.

- [ ] **Step 5: Run tests and static checks**

Run: `npm.cmd run test -- src/components/layout/layout.test.tsx`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the responsive shell**

```powershell
git add src/app/layout.tsx src/app/loading.tsx src/app/error.tsx src/components/icons src/components/layout
git rm src/app/BottomNavigation.tsx
git commit -m "feat: add responsive lunch app shell"
```

---

### Task 3: Login and signup redesign

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/signup/page.tsx`
- Create: `src/app/login/page.test.tsx`
- Create: `src/app/signup/page.test.tsx`

**Interfaces:**
- Consumes: `AuthShell`, `Button`, `FormField`, `FeedbackState`
- Preserves: `sanitizeReturnTo`, `/api/auth/login`, `/api/auth/signup`, request JSON fields and `router.push(returnTo)`

- [ ] **Step 1: Write failing semantic tests for both forms**

```tsx
// src/app/login/page.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams("returnTo=%2Frecommend") }));
import LoginPage from "./page";

describe("LoginPage", () => {
  it("uses visible labels and preserves the signup return path", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("닉네임")).toBeRequired();
    expect(screen.getByLabelText("PIN 4자리")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup?returnTo=%2Frecommend");
  });
});
```

```tsx
// src/app/signup/page.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams("returnTo=%2Frecommend") }));
import SignupPage from "./page";

describe("SignupPage", () => {
  it("uses visible labels and preserves the login return path", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("초대코드")).toBeRequired();
    expect(screen.getByLabelText("닉네임")).toBeRequired();
    expect(screen.getByLabelText("PIN 4자리")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("PIN 확인")).toHaveAttribute("maxlength", "4");
    expect(screen.getByRole("button", { name: "가입하기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login?returnTo=%2Frecommend");
  });
});
```

- [ ] **Step 2: Verify current placeholder-only fields fail**

Run: `npm.cmd run test -- src/app/login/page.test.tsx src/app/signup/page.test.tsx`

Expected: FAIL because visible labels are not associated with the current inputs.

- [ ] **Step 3: Refactor the forms without changing submission behavior**

Use `AuthShell` with the exact message `점심 결정, 이제 1~2분이면 충분해요.`. Wrap each input in `FormField`, set stable ids (`login-nickname`, `login-pin`, `signup-code`, `signup-nickname`, `signup-pin`, `signup-pin-confirm`), keep existing state variables and fetch bodies, and render server/network feedback as:

```tsx
{message && <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{message}</div>}
<Button type="submit" block disabled={isSubmitting} aria-busy={isSubmitting}>
  {isSubmitting ? "확인하고 있어요…" : "로그인"}
</Button>
```

For signup use `가입하고 있어요…` and `가입하기`. Keep `inputMode="numeric"`, `maxLength={4}`, required fields and return-path encoding unchanged.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd run test -- src/app/login/page.test.tsx src/app/signup/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the authentication UI**

```powershell
git add src/app/login src/app/signup
git commit -m "feat: redesign employee authentication screens"
```

---

### Task 4: Home state priority and dashboard composition

**Files:**
- Create: `src/components/lunch/home-state.ts`
- Create: `src/components/lunch/home-state.test.ts`
- Create: `src/components/lunch/HomeHero.tsx`
- Create: `src/components/lunch/TodayTimeline.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `tests/e2e/auth-flow.spec.ts`

**Interfaces:**
- Produces: `selectHomeHero(input: HomeHeroInput): HomeHeroKind`
- Produces: `HomeHero` for the selected state and `TodayTimeline` for lower-priority polls and appointments
- Preserves: all current home queries, visit actions, links and feedback-code allowlist

- [ ] **Step 1: Write the home priority tests**

```ts
// src/components/lunch/home-state.test.ts
import { describe, expect, it } from "vitest";
import { selectHomeHero } from "./home-state";

describe("selectHomeHero", () => {
  it("prioritizes confirmation over every other state", () => {
    expect(selectHomeHero({ needsConfirmation: true, needsPollResponse: true, hasPlannedLunch: true, hasCompletedLunch: true })).toBe("confirmation");
  });
  it("prioritizes an open poll before an existing decision", () => {
    expect(selectHomeHero({ needsConfirmation: false, needsPollResponse: true, hasPlannedLunch: true, hasCompletedLunch: false })).toBe("poll");
  });
  it("shows decision, follow-up and recommendation in that order", () => {
    expect(selectHomeHero({ needsConfirmation: false, needsPollResponse: false, hasPlannedLunch: true, hasCompletedLunch: false })).toBe("decision");
    expect(selectHomeHero({ needsConfirmation: false, needsPollResponse: false, hasPlannedLunch: false, hasCompletedLunch: true })).toBe("follow-up");
    expect(selectHomeHero({ needsConfirmation: false, needsPollResponse: false, hasPlannedLunch: false, hasCompletedLunch: false })).toBe("recommend");
  });
});
```

- [ ] **Step 2: Verify the priority module is missing**

Run: `npm.cmd run test -- src/components/lunch/home-state.test.ts`

Expected: FAIL because `home-state.ts` does not exist.

- [ ] **Step 3: Implement the pure priority function**

```ts
// src/components/lunch/home-state.ts
export type HomeHeroKind = "confirmation" | "poll" | "decision" | "follow-up" | "recommend";
export interface HomeHeroInput {
  needsConfirmation: boolean;
  needsPollResponse: boolean;
  hasPlannedLunch: boolean;
  hasCompletedLunch: boolean;
}
export function selectHomeHero(input: HomeHeroInput): HomeHeroKind {
  if (input.needsConfirmation) return "confirmation";
  if (input.needsPollResponse) return "poll";
  if (input.hasPlannedLunch) return "decision";
  if (input.hasCompletedLunch) return "follow-up";
  return "recommend";
}
```

- [ ] **Step 4: Extract presentation components and recompose the page**

`HomeHero` must accept `kind`, `todayVisit`, `todayMealRecord`, `soloNeedsConfirmation`, `appointmentsNeedingConfirmation`, `primaryPoll`, and `distanceM`. It renders only one accent card. Keep these exact actions and destinations:

- confirmation: `completeTodayVisit`, `markTodayVisitNoShow`, `/appointments/[id]`
- poll: `/polls/[id]`
- decision: `/restaurants/[id]`, `/recommend`, `cancelTodayVisit`, `completeTodayVisit`
- follow-up: `/reviews/new?restaurantId=...&visitId=...`
- recommend: `/recommend`

`TodayTimeline` receives non-primary polls and upcoming appointments and renders compact links. `src/app/page.tsx` keeps all existing queries and computes:

```ts
const heroKind = selectHomeHero({
  needsConfirmation: hasAnyConfirmation,
  needsPollResponse: relevantPolls.some((poll) => poll.status === "open"),
  hasPlannedLunch: todayVisit?.status === "planned",
  hasCompletedLunch: todayVisit?.status === "completed",
});
const primaryPoll = heroKind === "poll" ? relevantPolls.find((poll) => poll.status === "open") ?? null : null;
```

Render a responsive header with date, greeting, and notification link; the single `HomeHero`; `TodayTimeline`; and compact links to `/restaurants` and `/collection`. Remove `LogoutButton` from home only; keep it in `/me`.

- [ ] **Step 5: Update regression tests for the new hierarchy**

In `src/app/page.test.tsx`, preserve all existing assertions except the home logout assertion. Add one case where a planned visit and open poll coexist and assert the poll link is inside the element labelled `오늘 가장 중요한 할 일`, while `오늘의 점심` appears only in the lower timeline or summary. Avoid asserting class strings.

In `tests/e2e/auth-flow.spec.ts`, change logout to navigate to `/me` before clicking `로그아웃`; after signup assert links named `홈`, `식당`, `함께 먹기`, `알림`, `내 정보` are present in the mobile navigation.

- [ ] **Step 6: Run home tests**

Run: `npm.cmd run test -- src/components/lunch/home-state.test.ts src/app/page.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the home redesign**

```powershell
git add src/components/lunch/home-state.ts src/components/lunch/home-state.test.ts src/components/lunch/HomeHero.tsx src/components/lunch/TodayTimeline.tsx src/app/page.tsx src/app/page.test.tsx tests/e2e/auth-flow.spec.ts
git commit -m "feat: prioritize daily lunch actions on home"
```

---

### Task 5: Restaurant imagery and recommendation cards

**Files:**
- Modify: `src/lib/review-photos/queries.ts`
- Create: `src/components/lunch/RestaurantVisual.tsx`
- Create: `src/components/lunch/RecommendationCard.tsx`
- Create: `src/components/lunch/RecommendationCard.test.tsx`

**Interfaces:**
- Produces: `getRepresentativeRestaurantPhotoMap(restaurantIds: string[]): Promise<Map<string, string>>`
- Produces: `RestaurantVisual({ name, category, photoUrl, priority })`
- Produces: `RecommendationCard({ restaurant, photoUrl, reasons, reviewCount, variant, decideAction })`

- [ ] **Step 1: Write recommendation card tests**

```tsx
// src/components/lunch/RecommendationCard.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationCard } from "./RecommendationCard";

const restaurant = { id: "r1", name: "아주 긴 이름의 테스트 한식당", category: "한식", distanceM: 480, isActive: true, menuItems: [{ name: "제육볶음", price: 9000 }], lat: 35.1, lng: 129.1 };

describe("RecommendationCard", () => {
  it("makes the decision the primary action and keeps secondary links", () => {
    render(<RecommendationCard restaurant={restaurant} photoUrl={null} reasons={["가깝고 평가가 좋아요"]} reviewCount={4} variant="hero" decideAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: "여기로 결정" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "상세 보기" })).toHaveAttribute("href", "/restaurants/r1");
    expect(screen.getByRole("link", { name: "동료와 함께" })).toHaveAttribute("href", "/appointments/new?restaurantId=r1");
  });
  it("uses an accessible category fallback when there is no photo", () => {
    render(<RecommendationCard restaurant={restaurant} photoUrl={null} reviewCount={0} variant="alternative" decideAction={vi.fn()} />);
    expect(screen.getByRole("img", { name: "아주 긴 이름의 테스트 한식당 이미지 준비 중" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify missing components fail**

Run: `npm.cmd run test -- src/components/lunch/RecommendationCard.test.tsx`

Expected: FAIL because `RecommendationCard` does not exist.

- [ ] **Step 3: Add representative photo lookup**

```ts
// append to src/lib/review-photos/queries.ts
export async function getRepresentativeRestaurantPhotoMap(restaurantIds: string[]): Promise<Map<string, string>> {
  if (restaurantIds.length === 0) return new Map();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("review_photos")
    .select("storage_path, reviews!inner(restaurant_id)")
    .in("reviews.restaurant_id", restaurantIds)
    .order("created_at", { ascending: false })
    .limit(Math.max(20, restaurantIds.length * 4));
  const result = new Map<string, string>();
  for (const row of data ?? []) {
    const review = row.reviews as unknown as { restaurant_id: string } | null;
    if (review && !result.has(review.restaurant_id)) result.set(review.restaurant_id, toPublicUrl(row.storage_path));
  }
  return result;
}
```

- [ ] **Step 4: Implement visual fallback and card hierarchy**

`RestaurantVisual` uses `<img>` only when `photoUrl` exists, with `alt={`${name} 음식 사진`}`, `object-cover`, and aspect ratios `aspect-[16/10]` for hero and `aspect-[4/3]` for alternatives. Without a URL, render a `role="img"` element with `aria-label={`${name} 이미지 준비 중`}` and a muted category label; do not use an emoji.

`RecommendationCard` must use `Card`, `Badge`, `Button`, `buttonStyles`, and `RestaurantVisual`. For `variant="hero"`, place a full-width `여기로 결정` submit button first, `동료와 함께` as secondary, and `상세 보기` as a ghost link. For alternatives, keep the visual compact and do not render the decision form unless explicitly requested by the page.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm.cmd run test -- src/components/lunch/RecommendationCard.test.tsx`

Expected: PASS with 2 tests.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit restaurant visuals**

```powershell
git add src/lib/review-photos/queries.ts src/components/lunch/RestaurantVisual.tsx src/components/lunch/RecommendationCard.tsx src/components/lunch/RecommendationCard.test.tsx
git commit -m "feat: add restaurant visuals and recommendation cards"
```

---

### Task 6: Responsive recommendation filters and page composition

**Files:**
- Create: `src/app/recommend/RecommendationFilters.tsx`
- Create: `src/app/recommend/ResponsiveFilterPanel.tsx`
- Create: `src/app/recommend/ResponsiveFilterPanel.test.tsx`
- Modify: `src/app/recommend/page.tsx`
- Modify: `src/app/recommend/RecommendMapView.tsx`
- Create: `src/app/recommend/loading.tsx`

**Interfaces:**
- Consumes: existing `RecommendSearchParams`, `RecommendConditions`, `RESTAURANT_CATEGORIES`, `RADIUS_OPTIONS_M`, `RECENT_VISIT_WINDOW_DAYS`
- Produces: `RecommendationFilters({ conditions, radius, hasMenuData })`
- Produces: `ResponsiveFilterPanel({ summary, children })`
- Preserves: all existing GET parameter names and recommendation actions

- [ ] **Step 1: Write Bottom Sheet interaction tests**

```tsx
// src/app/recommend/ResponsiveFilterPanel.test.tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponsiveFilterPanel } from "./ResponsiveFilterPanel";

describe("ResponsiveFilterPanel", () => {
  it("opens, closes with Escape, and returns focus", () => {
    render(<ResponsiveFilterPanel summary="800m · 한식"><label htmlFor="radius">거리</label><select id="radius" /></ResponsiveFilterPanel>);
    const trigger = screen.getByRole("button", { name: "추천 조건 열기" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "추천 조건" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "추천 조건" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
```

- [ ] **Step 2: Verify the missing panel fails**

Run: `npm.cmd run test -- src/app/recommend/ResponsiveFilterPanel.test.tsx`

Expected: FAIL because `ResponsiveFilterPanel` does not exist.

- [ ] **Step 3: Implement the accessible responsive panel**

`ResponsiveFilterPanel` is a client component. The mobile trigger is `md:hidden`; the desktop panel is `hidden md:block`. When open, render a fixed backdrop and a bottom-aligned `role="dialog" aria-modal="true" aria-labelledby="recommend-filter-title"`. On open, save `document.activeElement`, focus the close button, set `document.body.style.overflow = "hidden"`, and register Escape. Cleanup restores body overflow and the saved trigger focus. The close button has `aria-label="추천 조건 닫기"`. Do not close while a descendant submit button has `aria-busy="true"`.

- [ ] **Step 4: Extract the existing GET filter form without renaming fields**

`RecommendationFilters` must render inputs named exactly `q`, `menuQ`, `category`, `radius`, `maxPrice`, `excludeRecent`, `excludeCongested`, `preferFavorites`, `preferGoodRating`, `preferFast`, `preferUnvisited`. Add visible labels, preserve all current defaults, disabled logic and helper copy, and submit with `이 조건으로 추천받기`.

The summary string must be:

```ts
const filterSummary = [
  conditions.category || "전체 음식",
  radius < 1000 ? `${radius}m` : `${radius / 1000}km`,
  conditions.maxPriceWon ? `${conditions.maxPriceWon.toLocaleString("ko-KR")}원 이하` : null,
].filter(Boolean).join(" · ");
```

- [ ] **Step 5: Recompose the recommendation page**

Keep lines that normalize conditions, fetch candidates, calculate weights, exclusions, review signals and results unchanged in behavior. Replace the local `RestaurantCard` and inline filter form with the new components. After `displayedIds` is known, load photos once:

```ts
const [reviewCounts, photoUrls] = await Promise.all([
  getReviewCounts(displayedIds),
  getRepresentativeRestaurantPhotoMap(displayedIds),
]);
```

Use a responsive `lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]` result area. Main card and alternatives occupy the main column; filters and the map occupy the side column on desktop. On mobile, render the filter trigger above the result and the map below alternatives. Empty results use `FeedbackState` with an action that reopens or resets conditions. Keep `rerollRecommendation` and `resetExclusions` forms below the main result, with `다시 추천` secondary and reset ghost styling.

Update `RecommendMapView` to `h-52 sm:h-64 lg:h-72`, `rounded-card`, and the shared line/surface colors. Add `src/app/recommend/loading.tsx` with a large visual Skeleton, text lines, CTA Skeleton and two alternative cards.

- [ ] **Step 6: Run recommendation tests**

Run: `npm.cmd run test -- src/app/recommend/ResponsiveFilterPanel.test.tsx src/components/lunch/RecommendationCard.test.tsx src/lib/recommend`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the recommendation redesign**

```powershell
git add src/app/recommend src/components/lunch src/lib/review-photos/queries.ts
git commit -m "feat: redesign recommendation experience"
```

---

### Task 7: Responsive browser coverage and full verification

**Files:**
- Create: `tests/e2e/ui-responsive.spec.ts`
- Modify: `tests/e2e/auth-flow.spec.ts`

**Interfaces:**
- Consumes: public `/`, `/login`, `/signup` and authenticated `/`, `/recommend`, `/me`
- Produces: automated horizontal-overflow and navigation regression coverage

- [ ] **Step 1: Add public breakpoint coverage**

```ts
// tests/e2e/ui-responsive.spec.ts
import { expect, test } from "@playwright/test";

const widths = [360, 390, 430, 768, 1280, 1440];

for (const width of widths) {
  test(`public screens fit ${width}px without horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/login", "/signup"]) {
      await page.goto(path);
      const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
    }
  });
}
```

- [ ] **Step 2: Extend the authenticated flow at mobile width**

At the start of `tests/e2e/auth-flow.spec.ts`, set `{ width: 390, height: 844 }`. After signup, assert the five navigation destinations and navigate to `/recommend`; assert heading `오늘 뭐 먹지?`, button `추천 조건 열기`, and no horizontal overflow. Navigate to `/me` before the existing logout action.

- [ ] **Step 3: Run unit and component tests**

Run: `npm.cmd run test`

Expected: all Vitest suites PASS.

- [ ] **Step 4: Run static verification**

Run: `npm.cmd run lint`

Expected: exit code 0 with no ESLint errors.

Run: `npm.cmd run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 5: Build the production bundle**

Run: `npm.cmd run build`

Expected: exit code 0 and all application routes compile.

- [ ] **Step 6: Run the browser suite against the isolated test environment**

Run: `npm.cmd run test:e2e`

Expected: auth flow, restaurant regression tests and the six responsive public-screen cases PASS. If `.env.test.local` is unavailable, do not point the suite at `.env.local`; report E2E as not run because the isolated test environment is missing.

- [ ] **Step 7: Perform visual browser review**

Start: `npm.cmd run dev -- -p 3000`

Check `/`, `/login`, `/signup` at all six widths. With a safe test employee session, also check authenticated `/` in recommendation, decision, confirmation and follow-up states, plus `/recommend` with a result, empty result and opened filter sheet. Verify no horizontal scrolling, fixed-navigation overlap, inaccessible focus, truncated primary CTA, or layout shift. Do not create test data in a non-isolated Supabase project.

- [ ] **Step 8: Commit responsive coverage**

```powershell
git add tests/e2e/auth-flow.spec.ts tests/e2e/ui-responsive.spec.ts
git commit -m "test: cover responsive phase one flows"
```

---

## Completion Review

- Compare every changed URL, action binding and GET field with its pre-change version.
- Confirm the home renders one primary Hero and does not expose logout.
- Confirm `/me` still provides logout.
- Confirm the recommendation algorithm and exclusion behavior have no code changes beyond presentation data lookups.
- Confirm the mobile navigation has five items and the desktop layout is not constrained to `max-w-md`.
- Confirm the final report lists actual command results, browser states that were inspected, any missing isolated test environment, and the next-cycle scope.
