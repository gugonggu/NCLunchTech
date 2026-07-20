-- 리뷰 신고(reports)를 댓글 신고까지 다루도록 확장한다 (2-4b)
-- 참고: .claude/CLAUDE.md 6.4절, 2차 로드맵 2-4 단계
--
-- review_id를 nullable로 바꾸고 comment_id를 추가한 뒤, 정확히 하나만 채워지도록 강제한다.
-- unique 제약은 Postgres에서 null 값끼리 서로 다르게 취급되므로(같다고 보지 않음),
-- review_id가 null인 행끼리는 기존 reports_unique_per_reporter_review에 영향을 주지 않는다.

alter table reports alter column review_id drop not null;
alter table reports add column comment_id uuid references review_comments (id);

alter table reports add constraint reports_one_target_check
  check ((review_id is not null) <> (comment_id is not null));

alter table reports add constraint reports_unique_per_reporter_comment
  unique (reporter_employee_id, comment_id);

create index reports_comment_id_idx on reports (comment_id);

-- 댓글 신고 처리: 신고 기각은 기존 admin_dismiss_report를 그대로 재사용한다(리뷰/댓글을 구분하지 않는
-- 범용 함수라 변경이 필요 없다). 삭제는 리뷰와 달리 soft delete이고, 같은 댓글에 대한 다른 pending
-- 신고들도 함께 해소한다는 점에서 admin_delete_reported_review와 별도 함수로 둔다.
create or replace function public.admin_delete_reported_comment(
  p_admin_id uuid,
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comment_id uuid;
  v_comment_snapshot jsonb;
begin
  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'admin not found' using errcode = '42501';
  end if;

  select comment.id, to_jsonb(comment)
  into v_comment_id, v_comment_snapshot
  from public.reports report
  join public.review_comments comment on comment.id = report.comment_id
  where report.id = p_report_id
    and report.status = 'pending'
    and comment.deleted_at is null
  for update of report, comment;

  if v_comment_id is null then
    return jsonb_build_object('status', 'target_not_found');
  end if;

  update public.review_comments
  set deleted_at = now()
  where id = v_comment_id;

  update public.reports
  set status = 'resolved'
  where comment_id = v_comment_id
    and status = 'pending';

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (
    p_admin_id,
    'delete_reported_comment',
    'review_comment',
    v_comment_id,
    jsonb_build_object('deletedComment', v_comment_snapshot, 'viaReportId', p_report_id)
  );

  return jsonb_build_object('status', 'comment_deleted', 'commentId', v_comment_id);
end;
$$;

revoke all on function public.admin_delete_reported_comment(uuid, uuid) from public;
revoke all on function public.admin_delete_reported_comment(uuid, uuid) from anon;
revoke all on function public.admin_delete_reported_comment(uuid, uuid) from authenticated;
grant execute on function public.admin_delete_reported_comment(uuid, uuid) to service_role;
