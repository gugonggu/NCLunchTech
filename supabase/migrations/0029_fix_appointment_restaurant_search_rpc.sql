-- RETURNS TABLE 출력 열(id 등)과 내부 CTE 열이 충돌하지 않도록 열 이름을 우선 해석한다.
-- plpgsql.variable_conflict는 Supabase에서 함수 설정으로 지정할 권한이 없으므로,
-- 기존 함수를 같은 정의로 다시 만들되 본문 컴파일 지시문을 삽입한다.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.search_appointment_restaurants(text, text, integer, boolean, text, integer, integer)'::regprocedure
  ) into v_definition;

  v_definition := regexp_replace(
    v_definition,
    E'AS (\\$[^$]*\\$)\\n',
    E'AS \\1\\n#variable_conflict use_column\\n',
    1,
    1,
    'n'
  );

  execute v_definition;
end;
$$;
