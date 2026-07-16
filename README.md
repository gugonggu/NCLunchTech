# 앤시점심기술

앤시정보기술 직원이 KNN타워 주변 식당을 추천받고 동료와 점심 약속을 만드는 사내 웹서비스입니다.
현재는 프로젝트 기반, 직원 프로필·PIN·세션, 관리자 Supabase Auth·권한까지 구현되어 있습니다.

## 요구 사항

- Node.js **22.23.1**(팀 표준, `.nvmrc` 참고). 최소 20.19.0 이상이면 대부분 동작하지만, Vitest 4의 네이티브 바인딩이 20.19.0 미만 패치 버전(예: 20.18.x)에서는 설치되지 않아 테스트가 실패합니다.
- Supabase 프로젝트 (URL, anon key, service role key)

## 설치

```bash
npm install
```

## 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 Supabase 프로젝트 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (브라우저에서 사용) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (서버 전용, 절대 클라이언트에 노출 금지) |

필수 환경변수가 없으면 `/api/health` 호출 시 500 에러로 명확히 실패합니다.

## 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 접속 시 로그인 전 진입 화면(빈 홈 화면)이 표시됩니다.

### 자주 발생하는 에러: `SyntaxError: Unexpected token '??='`

터미널에 잡혀 있는 Node가 20.19.0 미만(예: v14, v18)일 때 나는 에러입니다. `node -v`로 확인 후:

```bash
nvm install 22.23.1
nvm use 22.23.1
```

Windows에서 `nvm`(nvm-windows)은 **관리자 권한 터미널**에서만 버전 설치/전환이 됩니다. 관리자 권한이 없다면 Node 22를 별도 폴더에 압축 해제해 그 터미널 세션에서만 PATH 앞에 추가해 임시로 쓸 수도 있습니다.

## 연결 확인 (헬스체크)

```bash
curl http://localhost:3000/api/health
```

- 환경변수가 올바르면 `{"status":"ok","supabase":"reachable"}` 응답
- 환경변수가 없거나 Supabase에 연결할 수 없으면 에러 메시지와 함께 실패 응답

## 품질 검사

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test        # Vitest 유닛/컴포넌트 테스트
npm run build       # production build
```

## 현재 구현 범위

- Next.js App Router + TypeScript + Tailwind CSS 기본 설정
- 모바일 우선 공통 레이아웃, 확정 색상 토큰(`brand`, `brand-dark`, `brand-bg`)
- 서버 전용 환경변수 검증(`src/lib/env.ts`)
- Supabase 서버(서비스 롤)/브라우저(anon key) 클라이언트 분리 구조
- `/api/health` 연결 확인 라우트
- 직원 가입/로그인/로그아웃(닉네임+PIN, bcrypt 해시, 5회 실패/10분 잠금, 세션 쿠키)
- 관리자 로그인/로그아웃(Supabase Auth, `admins` 테이블 소속 여부 확인, 작업 로그)

Kakao API 연동, 식당/추천/방문 기능은 다음 단계에서 구현합니다.
