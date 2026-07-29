-- "오늘 같이 먹기" 상태에 "도시락을 먹어요"를 추가한다.

alter table lunch_availabilities drop constraint lunch_availabilities_status_check;

alter table lunch_availabilities
  add constraint lunch_availabilities_status_check
  check (status in ('looking_for_company', 'has_appointment', 'eating_alone', 'eating_lunchbox', 'away_or_skipping'));
