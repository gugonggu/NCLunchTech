-- PL/pgSQL RETURNS TABLE 출력 열과 CTE 열의 이름 충돌을 제거한다.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer)'::regprocedure
  ) into v_definition;

  v_definition := regexp_replace(
    v_definition,
    'filtered as [(][[:space:]]*select [*][[:space:]]*from candidates[[:space:]]*where distance_m <= v_radius_m[[:space:]]*and [(]not coalesce[(]p_open_now, false[)] or is_open_now[)][[:space:]]*[)]',
    'filtered as (select c.* from candidates c where c.distance_m <= v_radius_m and (not coalesce(p_open_now, false) or c.is_open_now))',
    'i'
  );

  if position('c.distance_m <= v_radius_m' in v_definition) = 0 then
    raise exception 'appointment_restaurant_search_filter_qualification_failed';
  end if;

  execute v_definition;
end;
$$;
