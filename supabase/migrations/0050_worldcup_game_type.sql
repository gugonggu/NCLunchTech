-- 메뉴 월드컵과 같은 세션/대진 구조를 공유하는 식당 월드컵 추가
-- 참고: docs 앤시점심기술 미니게임 및 업적 시스템 기획 2.2절
-- 새 테이블을 따로 만들지 않고 game_type 컬럼으로 후보 종류만 구분한다(대진 진행 로직은 동일).

alter table menu_worldcup_sessions
  add column if not exists game_type text not null default 'MENU';

alter table menu_worldcup_sessions
  add constraint menu_worldcup_sessions_game_type_check check (game_type in ('MENU', 'RESTAURANT'));

create index if not exists menu_worldcup_sessions_employee_game_type_idx
  on menu_worldcup_sessions (employee_id, game_type, status);
