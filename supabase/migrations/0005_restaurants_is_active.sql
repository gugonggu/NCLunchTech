-- 식당 활성 상태 (추천 후보 제외 대비, 관리자 활성화 토글 UI는 이후 단계)
-- 참고: .claude/CLAUDE.md 16절(관리자 기능: 식당 활성/비활성)

alter table restaurants
  add column is_active boolean not null default true;
