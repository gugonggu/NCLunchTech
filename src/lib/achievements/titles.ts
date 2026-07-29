import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface EarnedTitle {
  id: string;
  name: string;
  description: string | null;
}

interface EarnedTitleRelation {
  id: string;
  name: string;
  description: string | null;
}

interface EarnedTitleRow {
  achievements: {
    titles: EarnedTitleRelation[] | EarnedTitleRelation | null;
  } | null;
}

/** 이 직원이 달성한 업적 중 칭호가 걸려 있는 것만 골라 대표 칭호 후보 목록으로 돌려준다. */
export async function getEarnedTitlesForEmployee(employeeId: string): Promise<EarnedTitle[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("user_achievements")
    .select("achievements(titles(id, name, description))")
    .eq("employee_id", employeeId);

  const rows = (data ?? []) as unknown as EarnedTitleRow[];
  const titles: EarnedTitle[] = [];
  for (const row of rows) {
    const relation = row.achievements?.titles;
    const title = Array.isArray(relation) ? relation[0] : relation;
    if (title) {
      titles.push({ id: title.id, name: title.name, description: title.description });
    }
  }
  return titles;
}

/**
 * 대표 칭호를 저장한다. titleId가 null이면 표시를 끈다. 클라이언트가 보낸 titleId는 신뢰하지 않고,
 * 실제로 이 직원이 달성한 업적의 칭호인지 서버에서 다시 확인한 뒤에만 저장한다.
 */
export async function setSelectedTitle(employeeId: string, titleId: string | null): Promise<boolean> {
  const supabase = createServiceRoleClient();

  if (titleId !== null) {
    const earnedTitles = await getEarnedTitlesForEmployee(employeeId);
    if (!earnedTitles.some((title) => title.id === titleId)) {
      return false;
    }
  }

  const { error } = await supabase.from("employees").update({ selected_title_id: titleId }).eq("id", employeeId);
  return !error;
}
