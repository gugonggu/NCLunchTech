# 아바타 기능 설계

## 목표

직원이 2D 또는 3D 아바타 중 하나를 선택해 커스터마이징하고, 내 정보와 리뷰에서 닉네임과 함께 보여준다.

## 범위

- 직원은 아바타 타입을 `2d` 또는 `3d` 중 하나로 선택하고 언제든 바꿀 수 있다.
- 2D는 DiceBear 한 스타일의 파트(머리·머리색·피부색·눈·입·옷·액세서리 등)를 선택해 조합한다.
- 3D는 Ready Player Me 임베드 에디터로 커스터마이징하고, 결과 GLB 모델을 저장한다.
- "내 정보"에서는 타입에 맞는 인터랙티브 에디터(2D 파트 선택 폼 / 3D 회전 뷰어)를 제공한다.
- 리뷰 작성자 표시에는 타입과 무관하게 정적 미리보기 이미지만 보여준다.
- 아바타를 설정하지 않은 직원은 고정된 기본 아바타 이미지로 표시한다.

## 제외 범위

- 리뷰 외의 화면(오늘 같이 먹기 목록, 약속 참여자 목록, 동료 초대 검색 등)에 아바타를 노출하는 것은 이번 범위가 아니다. 리뷰 반응을 보고 이후 단계에서 확장한다.
- 2D 파트를 직접 그리거나 외주 제작하는 것, DiceBear 외 다른 2D 아바타 라이브러리 검토는 하지 않는다.
- 3D 모델을 자체 제작·리깅하는 것은 하지 않는다(Ready Player Me에 위임).
- 아바타 관련 통계, 랭킹, 도감 연동은 다루지 않는다.

## 데이터 모델

`employees` 테이블에 컬럼을 추가한다.

- `avatar_type text`: `'2d'` 또는 `'3d'`. 기본 `null`(미설정 = 기본 아바타 표시).
- `avatar_options jsonb`: 2D일 때 DiceBear 트레잇 선택값. 3D면 `null`.
- `avatar_model_url text`: 3D일 때 Ready Player Me GLB URL. 2D면 `null`.
- `avatar_preview_url text`: 타입에 관계없이 항상 최신 상태를 반영하는 정적 미리보기 이미지 URL. 리뷰 등 "그냥 보여주기만 하는" 화면은 이 필드만 참조한다.

`check` 제약으로 `avatar_type`이 `2d`일 때 `avatar_model_url`이 `null`, `3d`일 때 `avatar_options`가 `null`, `avatar_type`이 `null`(미설정)일 때 `avatar_options`와 `avatar_model_url` 둘 다 `null`임을 강제한다.

## 서버 동작

### 2D 저장

1. 서버 액션이 세션의 직원을 확인한다.
2. 받은 옵션 값이 고정된 DiceBear 스타일의 허용 트레잇 목록에 있는지 화이트리스트로 검증한다.
3. `avatar_type = '2d'`, `avatar_options`를 저장하고 `avatar_model_url`은 `null`로 비운다.
4. 서버에서 `@dicebear/core`로 동일 옵션의 SVG를 생성해 PNG로 변환하고, `avatars/{employeeId}.png` 경로로 Supabase Storage에 덮어쓴다.
5. 업로드에 성공하면 `avatar_preview_url`을 새 URL(캐시 무효화용 타임스탬프 쿼리 포함)로 갱신한다. 실패하면 옵션 저장은 유지하고 `avatar_preview_url`은 이전 값을 그대로 둔 채 안내 메시지를 반환한다.

### 3D 저장

1. 클라이언트가 Ready Player Me 임베드 에디터의 완료 콜백(`postMessage`)으로 받은 GLB URL을 서버 액션에 전달한다.
2. 서버는 URL이 Ready Player Me 도메인 형식인지 검증한다.
3. `avatar_type = '3d'`, `avatar_model_url`을 저장하고 `avatar_options`는 `null`로 비운다.
4. Ready Player Me 렌더 API로 정면 스냅샷 PNG를 요청해 다운로드하고, 같은 `avatars/{employeeId}.png` 경로에 덮어쓴다.
5. 성공/실패 처리는 2D와 동일한 방식을 따른다.

### 조회

- "내 정보"는 `avatar_type`, `avatar_options`, `avatar_model_url`, `avatar_preview_url`을 모두 조회해 타입에 맞는 에디터와 현재 아바타를 표시한다.
- 리뷰 목록/상세는 작성자의 `avatar_preview_url`만 조회한다. 값이 없으면 고정된 기본 아바타 이미지를 사용한다.

## 클라이언트 UI

### 내 정보 (`/me`)

- 아바타 타입 전환 컨트롤(2D/3D)을 제공한다.
- 2D 선택 시: 트레잇별 드롭다운/스와치로 구성된 폼과, `@dicebear/core`로 클라이언트에서 즉시 계산하는 실시간 SVG 미리보기를 보여준다.
- 3D 선택 시: Ready Player Me 임베드 에디터(iframe)를 열어 완성하면 GLB URL을 받아 저장하고, 저장 후에는 `@readyplayerme/visage`(또는 `react-three-fiber` + `OrbitControls`)로 회전 가능한 3D 뷰어를 보여준다. 이 3D 렌더링 코드는 `/me` 페이지에서만 동적 import로 불러와 다른 페이지 번들에 영향을 주지 않는다.
- 아직 아바타가 없으면 기본 아바타 이미지와 "아바타를 만들어보세요" 안내를 보여준다.

### 리뷰

- 작성자 표시 옆에 `avatar_preview_url`(없으면 기본 아바타) 이미지를 작게 보여준다. 타입 분기 없이 이미지 렌더링만 한다.

## 외부 서비스

- **DiceBear**: `@dicebear/core` npm 패키지로 서버·클라이언트 모두에서 로컬 생성한다. 외부 API 호출이 없어 비용·가용성 문제가 없다.
- **Ready Player Me**: 무료 티어(MAU 기준)로 사내 규모에 충분하다. 앱 ID 발급이 필요하며, 이는 구현 단계에서 별도로 안내한다.

## 오류 및 경계 조건

- 2D 트레잇 값은 서버 화이트리스트로만 검증하고, 허용되지 않은 값은 거부한다.
- 3D 모델 URL은 Ready Player Me 도메인 형식인지 검증한다.
- 타입을 전환하면 이전 타입의 필드(`avatar_options` 또는 `avatar_model_url`)를 함께 비운다.
- 미리보기 이미지 생성(PNG 변환/업로드, RPM 렌더 요청)이 실패해도 옵션·모델 URL 저장 자체는 성공시키고, 미리보기는 이전 값을 유지하며 재시도 안내를 표시한다.
- 미리보기 이미지는 직원별 고정 경로에 덮어쓰므로 별도 정리(cleanup) 작업이 필요 없다.
- Ready Player Me 장애 시에도 3D 편집만 일시적으로 막히고 다른 기능에는 영향이 없다.

## 검증

- 순수 검증 로직: DiceBear 트레잇 화이트리스트, Ready Player Me URL 검증, 타입 전환 시 필드 정리를 단위 테스트한다.
- 저장 흐름: 미리보기 생성 성공/실패 각 케이스에서 저장되는 DB 값을 단위 테스트한다(Storage·렌더 API는 모킹).
- UI: 내 정보의 2D 폼/3D 뷰어 자리 표시, 기본 아바타 표시, 리뷰 목록의 미리보기 이미지 렌더링을 컴포넌트 테스트한다.
- 전체 검증: lint, typecheck, 단위/컴포넌트 테스트, build를 실행한다.
