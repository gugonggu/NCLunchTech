# 앤시점심기술

앤시정보기술 직원이 KNN타워 주변 식당을 추천받고 동료와 점심 약속을 만드는 사내 웹서비스입니다.

## 요구 사항

- Node.js **22.23.1**(팀 표준, `.nvmrc` 참고). 최소 20.19.0 이상이면 대부분 동작하지만, Vitest 4의 네이티브 바인딩이 20.19.0 미만 패치 버전(예: 20.18.x)에서는 설치되지 않아 테스트가 실패합니다.
- Supabase 프로젝트 (URL, anon key, service role key)
- Kakao REST API 키(식당 동기화 기능을 쓸 경우)

## 설치

```bash
npm install
```

## 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

| 변수 | 용도 | 필수 여부 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 앱 런타임 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key(브라우저에서 관리자 Auth 세션에 사용) | 앱 런타임 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key(서버 전용, 절대 클라이언트에 노출 금지) | 앱 런타임 필수 |
| `KAKAO_REST_API_KEY` | Kakao Local API(주소 지오코딩, 식당 카테고리 검색) | 관리자의 "카카오에서 식당 가져오기" 기능에만 필요 |
| `SUPABASE_DB_URL` | Postgres 직접 연결 문자열(Session pooler) | **앱 런타임에는 쓰이지 않습니다.** 마이그레이션 적용이나 조사용 스크립트를 실행할 때만 필요합니다(`src/` 어디에서도 참조하지 않음) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | Kakao Map JS SDK | 현재 미사용(지도 임베드 기능 자체가 아직 없음). 지도 기능을 붙일 때 추가 예정 |

필수 환경변수가 없으면 `/api/health` 호출 시 500 에러로 명확히 실패합니다.

## 직원 인증과 관리자 인증은 완전히 분리되어 있습니다

- **직원**: 회사 공용 초대코드 + 닉네임 + 4자리 PIN으로 자체 가입/로그인(`employees`/`employee_sessions` 테이블, Supabase Auth 미사용). 세션은 자체 발급 쿠키(`nc_session`)로 관리합니다.
- **관리자**: Supabase Auth(이메일+비밀번호)를 사용하며, `admins` 테이블에 등록된 계정만 실제 관리자 화면에 접근할 수 있습니다. 두 인증 체계는 쿠키·테이블·검증 로직이 서로 겹치지 않습니다.
- 초기 관리자 계정은 Supabase 대시보드 Authentication에서 직접 만든 뒤, `admins` 테이블에 그 계정의 UUID를 연결해야 합니다(자체 가입 화면 없음, 의도된 설계).

## 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 접속 시 로그인 상태에 따라 다른 홈 화면이 표시됩니다.

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

## Supabase 마이그레이션 적용 방법

`supabase/migrations/`에 순서대로 번호가 매겨진 SQL 파일이 있습니다(`0001`~`0005`). 아래 중 한 가지 방법으로 적용합니다.

**방법 1 — Supabase 대시보드 SQL Editor (권장, 별도 도구 설치 불필요)**
각 마이그레이션 파일 내용을 순서대로 복사해 SQL Editor에서 실행합니다.

**방법 2 — Supabase CLI**
```bash
npx supabase db push --db-url "<Session pooler 연결 문자열>" --workdir .
```
- Direct connection(`db.<ref>.supabase.co`)은 IPv6 전용이라 일부 네트워크에서 연결이 안 될 수 있습니다. 이 경우 Project Settings → Database → Connection string에서 **Session pooler**(IPv4) URI를 사용하세요.
- `supabase link`로 프로젝트를 미리 연결해두는 방식 대신, 매번 `--db-url`을 명시적으로 지정하는 것을 권장합니다(어떤 프로젝트에 적용되는지 항상 명확하게 하기 위함).

적용 후 `app_settings` 테이블에 초대코드와 회사 좌표(KNN타워)를 등록해야 가입·식당 조회 기능이 정상 동작합니다(관리자 화면이 아직 없어 SQL로 직접 등록).

## Kakao 식당 동기화

관리자 화면(`/admin/restaurants`)의 "카카오에서 식당 가져오기" 버튼은 `KAKAO_REST_API_KEY`와 `app_settings.company_lat/company_lng`가 설정되어 있어야 동작합니다. Kakao Developers에서 앱을 만들고 **카카오맵(Local API)** 제품을 활성화한 뒤 REST API 키를 발급받으세요.

## 품질 검사

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # 순수 유닛/컴포넌트 테스트 (외부 DB·네트워크 없음)
npm run test:integration  # 테스트 전용 Supabase를 사용하는 DB 통합 테스트
npm run test:e2e      # 테스트 전용 Supabase를 사용하는 Playwright E2E
npm run build         # production build
```

`test:integration`/`test:e2e`는 **개발용과 완전히 분리된 테스트 전용 Supabase 프로젝트**가 필요합니다. `.env.test.local.example`을 참고해 `.env.test.local`을 만드세요. 개발용 프로젝트와 같은 값을 넣으면 실행 시점에 자동으로 감지되어 즉시 실패합니다.

## 현재 구현된 기능

- Next.js App Router + TypeScript + Tailwind CSS, 모바일 우선 레이아웃
- 직원 가입/로그인/로그아웃(닉네임+PIN, bcrypt 해시, 5회 실패/10분 잠금, 세션 쿠키), 로그인 상태에 따른 홈 화면 분기
- 관리자 로그인/로그아웃(Supabase Auth, `admins` 소속 확인, 작업 로그)
- Kakao 식당 동기화(관리자), 식당 목록/검색/필터/정렬/상세(직원, 활성 식당만 노출)
- 메뉴 추가·가격 수정·품절 처리(식당 소속 검증 포함), 영업시간 등록(서버 검증 포함), 모든 변경 이력 기록

## 아직 미구현인 기능

즉시/조건 추천, "여기로 결정"과 개인 방문, 동료 초대·약속, 방문 확인·리뷰, 사진, 상태 제보, 즐겨찾기, 도감, 내부 알림, 신고, CSV 업로드, 관리자 사용자·식당 활성화 관리 화면, Kakao Map 지도 임베드.
