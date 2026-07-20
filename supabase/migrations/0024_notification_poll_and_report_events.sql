-- 투표 종료·최종 결정·신고 처리 결과 알림 타입 추가 (2-8)
-- 참고: .claude/CLAUDE.md 6.8절, 2차 로드맵 2-8 단계

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'appointment_invited',
    'appointment_updated',
    'appointment_cancelled',
    'poll_invited',
    'review_commented',
    'poll_closed',
    'poll_decided',
    'report_resolved'
  ));
