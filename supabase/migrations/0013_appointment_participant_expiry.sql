-- 응답 없이 예정 시각이 지난 초대(pending)를 "expired"(응답 없음)로 남길 수 있도록 허용한다.
-- 참고: .claude/CLAUDE.md 12절(약속 상태: 대기/확정/거절/응답 없음/취소)
-- 기존에는 "응답 없음"을 저장하지 않고 화면에서만 계산해 숨겼는데(0007 마이그레이션 주석 참고),
-- pending 행이 DB에 영구적으로 쌓이는 문제가 있어 조회 시점에 지연 반영(lazy update)한다.

alter table appointment_participants drop constraint appointment_participants_status_check;
alter table appointment_participants add constraint appointment_participants_status_check
  check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed', 'expired'));
