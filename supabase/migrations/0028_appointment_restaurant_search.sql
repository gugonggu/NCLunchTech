create extension if not exists pg_trgm;

create index if not exists restaurants_active_name_trgm_idx
  on public.restaurants using gin (name gin_trgm_ops)
  where is_active = true;
create index if not exists restaurants_active_category_idx
  on public.restaurants (category)
  where is_active = true;
create index if not exists restaurants_active_created_at_idx
  on public.restaurants (created_at desc)
  where is_active = true;
create index if not exists restaurants_active_coordinates_idx
  on public.restaurants (lat, lng)
  where is_active = true;

create or replace function public.search_appointment_restaurants(
  p_query text,
  p_category text,
  p_radius_m integer,
  p_open_now boolean,
  p_sort text,
  p_page integer,
  p_page_size integer
)
returns table (
  id uuid,
  kakao_place_id text,
  name text,
  category text,
  address text,
  distance_m integer,
  is_open_now boolean,
  total_count bigint,
  page_number integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_lat numeric;
  v_company_lng numeric;
  v_radius_m integer := case when p_radius_m in (300, 500, 800, 1200, 2000) then p_radius_m else 800 end;
  v_sort text := case when p_sort in ('distance', 'name', 'new') then p_sort else 'distance' end;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 20);
  v_query text := left(btrim(coalesce(p_query, '')), 50);
  v_category text := btrim(coalesce(p_category, ''));
  v_seoul_now timestamp := timezone('Asia/Seoul', now());
  v_latitude_delta numeric;
  v_longitude_delta numeric;
  v_total_count bigint;
begin
  select company_lat, company_lng
  into v_company_lat, v_company_lng
  from public.app_settings
  where id = 1;

  if v_company_lat is null or v_company_lng is null then
    raise exception 'company_location_missing' using errcode = 'P0001';
  end if;

  v_latitude_delta := v_radius_m::numeric / 111320;
  v_longitude_delta := v_radius_m::numeric / (111320 * greatest(abs(cos(radians(v_company_lat))), 0.000001));

  with candidates as (
    select
      r.id,
      (2 * 6371000 * asin(sqrt(
        power(sin(radians(r.lat - v_company_lat) / 2), 2)
        + cos(radians(v_company_lat)) * cos(radians(r.lat))
        * power(sin(radians(r.lng - v_company_lng) / 2), 2)
      )))::integer as distance_m,
      exists (
        select 1
        from public.restaurant_hours h
        where h.restaurant_id = r.id
          and h.day_of_week = extract(dow from v_seoul_now)::smallint
          and h.is_closed = false
          and h.open_time <= v_seoul_now::time
          and h.close_time > v_seoul_now::time
      ) as is_open_now
    from public.restaurants r
    where r.is_active = true
      and r.lat between v_company_lat - v_latitude_delta and v_company_lat + v_latitude_delta
      and r.lng between v_company_lng - v_longitude_delta and v_company_lng + v_longitude_delta
      and (v_query = '' or r.name ilike '%' || v_query || '%')
      and (v_category = '' or r.category = v_category)
  ), filtered as (
    select *
    from candidates
    where distance_m <= v_radius_m
      and (not coalesce(p_open_now, false) or is_open_now)
  ), counted as (
    select count(*)::bigint as total_count from filtered
  )
  select c.total_count into v_total_count from counted c;

  v_page := least(v_page, greatest(1, ceil(v_total_count::numeric / v_page_size)::integer));

  return query
  with candidates as (
    select
      r.id,
      r.kakao_place_id,
      r.name,
      r.category,
      r.address,
      r.created_at,
      exists (
        select 1
        from public.restaurant_hours h
        where h.restaurant_id = r.id
          and h.day_of_week = extract(dow from v_seoul_now)::smallint
          and h.is_closed = false
          and h.open_time <= v_seoul_now::time
          and h.close_time > v_seoul_now::time
      ) as is_open_now,
      (2 * 6371000 * asin(sqrt(
        power(sin(radians(r.lat - v_company_lat) / 2), 2)
        + cos(radians(v_company_lat)) * cos(radians(r.lat))
        * power(sin(radians(r.lng - v_company_lng) / 2), 2)
      )))::integer as distance_m
    from public.restaurants r
    where r.is_active = true
      and r.lat between v_company_lat - v_latitude_delta and v_company_lat + v_latitude_delta
      and r.lng between v_company_lng - v_longitude_delta and v_company_lng + v_longitude_delta
      and (v_query = '' or r.name ilike '%' || v_query || '%')
      and (v_category = '' or r.category = v_category)
  ), filtered as (
    select *
    from candidates
    where distance_m <= v_radius_m
      and (not coalesce(p_open_now, false) or is_open_now)
  ), counted as (
    select count(*)::bigint as total_count from filtered
  )
  select
    r.id,
    r.kakao_place_id,
    r.name,
    r.category,
    r.address,
    r.distance_m,
    r.is_open_now,
    c.total_count,
    v_page
  from filtered r
  cross join counted c
  order by
    case when v_sort = 'distance' then r.distance_m end asc nulls last,
    case when v_sort = 'name' then r.name end asc nulls last,
    case when v_sort = 'new' then r.created_at end desc nulls last,
    r.id
  limit v_page_size
  offset (v_page - 1) * v_page_size;
end;
$$;

revoke execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) from public;
revoke execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) from anon;
revoke execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) from authenticated;
grant execute on function public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer) to service_role;
