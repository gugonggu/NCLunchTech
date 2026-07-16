-- 식당 기본 정보(Kakao 연동) 및 회사 좌표/기본 반경 설정
-- 참고: .claude/CLAUDE.md 2절(Kakao Local API), 4절(위치와 식당)

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  kakao_place_id text not null unique,
  name text not null,
  category text not null,
  address text,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  phone text,
  created_by uuid references admins (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_category_check check (
    category in ('한식', '중식', '일식', '양식', '분식', '아시아 음식', '패스트푸드', '카페·간단식', '기타')
  )
);

create index if not exists restaurants_category_idx on restaurants (category);

alter table restaurants enable row level security;
-- 정책을 추가하지 않는다: 서비스 롤 키를 쓰는 서버 코드만 접근 가능하다.

-- 회사 좌표/기본 반경. 반경 옵션(300/500/800/1.2km/2km)은 추천 단계에서 코드 상수로 관리하고,
-- 여기서는 관리자가 바꿀 수 있는 기본값만 저장한다.
alter table app_settings
  add column if not exists company_lat numeric(10, 7),
  add column if not exists company_lng numeric(10, 7),
  add column if not exists default_radius_m integer not null default 800;

-- 적용 후 아래 쿼리로 회사 좌표를 등록하세요 (Kakao 지오코딩 결과):
-- update app_settings set company_lat = 35.1720591571479, company_lng = 129.128432630796 where id = 1;
