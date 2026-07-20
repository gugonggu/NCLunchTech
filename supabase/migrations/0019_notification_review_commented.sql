-- 리뷰 댓글 알림 타입 추가 (2-4a)

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'appointment_invited',
    'appointment_updated',
    'appointment_cancelled',
    'poll_invited',
    'review_commented'
  ));
