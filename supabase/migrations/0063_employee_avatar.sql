-- 2D 아바타 커스터마이징(DiceBear). 이번 단계는 2D만 지원하며, 3D는 별도 계획에서
-- avatar_type = '3d'와 avatar_model_url 컬럼을 추가해 확장한다.
-- 참고: docs/superpowers/specs/2026-07-30-avatar-design.md

alter table employees add column if not exists avatar_type text;
alter table employees add column if not exists avatar_options jsonb;
alter table employees add column if not exists avatar_storage_path text;

do $$
begin
  alter table employees add constraint employees_avatar_type_check
    check (avatar_type is null or avatar_type in ('2d'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table employees add constraint employees_avatar_options_requires_2d_check
    check (avatar_options is null or avatar_type = '2d');
exception
  when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
