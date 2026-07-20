-- 약속에 메뉴 투표가 생겼을 때 참여자에게 보내는 알림 타입 추가
-- 참고: 2차 로드맵 2-2 단계(투표 초대 알림은 참여자가 확정된 약속-메뉴투표 케이스에서만 발송)

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('appointment_invited', 'appointment_updated', 'appointment_cancelled', 'poll_invited'));
