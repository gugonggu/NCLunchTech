-- RETURNS TABLE 출력 열과 같은 이름의 내부 열을 모두 명시적으로 수식한다.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer)'::regprocedure
  ) into v_definition;

  v_definition := regexp_replace(v_definition, 'from ([[:alnum:]_.]*app_settings)', E'from \\1 settings', 'i');
  v_definition := regexp_replace(v_definition, 'where id = 1;', 'where settings.id = 1;', 'i');

  if position('settings.id = 1' in v_definition) = 0 then
    raise exception 'appointment_restaurant_search_column_qualification_failed';
  end if;

  execute v_definition;
end;
$$;
