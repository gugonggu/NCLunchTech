create table monthly_leaderboard_periods (
  id uuid primary key default gen_random_uuid(),
  month_key date not null unique,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table monthly_leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references monthly_leaderboard_periods(id) on delete cascade,
  employee_id uuid not null references employees(id),
  nickname_snapshot text not null,
  review_score integer not null,
  explorer_score integer not null,
  menu_score integer not null,
  total_score integer not null,
  rank integer not null,
  is_monthly_leader boolean not null default false,
  created_at timestamptz not null default now(),
  constraint monthly_leaderboard_entries_review_score_nonnegative_check check (review_score >= 0),
  constraint monthly_leaderboard_entries_explorer_score_nonnegative_check check (explorer_score >= 0),
  constraint monthly_leaderboard_entries_menu_score_nonnegative_check check (menu_score >= 0),
  constraint monthly_leaderboard_entries_total_score_nonnegative_check check (total_score >= 0),
  constraint monthly_leaderboard_entries_rank_positive_check check (rank > 0),
  constraint monthly_leaderboard_entries_total_score_check
    check (total_score = review_score + explorer_score + menu_score),
  unique (period_id, employee_id)
);

create index monthly_leaderboard_entries_period_rank_idx
  on monthly_leaderboard_entries (period_id, rank, total_score desc);
create index monthly_leaderboard_entries_employee_period_idx
  on monthly_leaderboard_entries (employee_id, period_id);
create index monthly_leaderboard_entries_period_leaders_idx
  on monthly_leaderboard_entries (period_id) where is_monthly_leader;

alter table monthly_leaderboard_periods enable row level security;
alter table monthly_leaderboard_entries enable row level security;

create function public.finalize_monthly_leaderboard(p_month_key date, p_entries jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_id uuid;
begin
  insert into monthly_leaderboard_periods (month_key)
  values (p_month_key)
  on conflict (month_key) do nothing
  returning id into v_period_id;

  if v_period_id is null then
    return false;
  end if;

  insert into monthly_leaderboard_entries (
    period_id,
    employee_id,
    nickname_snapshot,
    review_score,
    explorer_score,
    menu_score,
    total_score,
    rank,
    is_monthly_leader
  )
  select
    v_period_id,
    entry.employee_id,
    entry.nickname_snapshot,
    entry.review_score,
    entry.explorer_score,
    entry.menu_score,
    entry.total_score,
    entry.rank,
    entry.is_monthly_leader
  from jsonb_to_recordset(p_entries) as entry(
    employee_id uuid,
    nickname_snapshot text,
    review_score integer,
    explorer_score integer,
    menu_score integer,
    total_score integer,
    rank integer,
    is_monthly_leader boolean
  );

  return true;
end;
$$;

revoke all on function public.finalize_monthly_leaderboard(date, jsonb) from public;
grant execute on function public.finalize_monthly_leaderboard(date, jsonb) to service_role;
