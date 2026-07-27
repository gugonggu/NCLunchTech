alter table notifications drop constraint notifications_type_check;

alter table notifications add constraint notifications_type_check
  check (type in (
    'appointment_invited',
    'appointment_applied',
    'appointment_application_accepted',
    'appointment_application_declined',
    'appointment_updated',
    'appointment_cancelled',
    'poll_invited',
    'review_commented',
    'poll_closed',
    'poll_decided',
    'report_resolved',
    'settlement_created',
    'settlement_updated'
  ));
