import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractTitleName, type TitlesRelation } from "./title-relation";

export interface AchievementSummaryItem {
  code: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  targetValue: number;
  pointReward: number;
  isHidden: boolean;
  earned: boolean;
  earnedAt: string | null;
  currentValue: number;
  titleName: string | null;
}

export interface AchievementSummary {
  items: AchievementSummaryItem[];
  totalPoints: number;
  earnedCount: number;
  totalCount: number;
}

interface ActiveAchievementRow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  target_value: number;
  point_reward: number;
  is_hidden: boolean;
  titles: TitlesRelation;
}

/** 숨겨진 업적은 달성 전까지 이름/설명/진행도를 노출하지 않는다. */
function maskIfHidden(item: AchievementSummaryItem): AchievementSummaryItem {
  if (!item.isHidden || item.earned) {
    return item;
  }
  return {
    ...item,
    name: "???",
    description: "아직 발견하지 못한 숨겨진 업적입니다.",
    currentValue: 0,
  };
}

export async function getMyAchievementSummary(employeeId: string): Promise<AchievementSummary> {
  const supabase = createServiceRoleClient();

  const [{ data: achievementRows }, { data: progressRows }, { data: earnedRows }] = await Promise.all([
    supabase
      .from("achievements")
      .select("id, code, name, description, category, tier, target_value, point_reward, is_hidden, titles(name)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("user_achievement_progress").select("achievement_id, current_value").eq("employee_id", employeeId),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("employee_id", employeeId),
  ]);

  const achievements = (achievementRows ?? []) as unknown as ActiveAchievementRow[];
  const progressByAchievementId = new Map((progressRows ?? []).map((r) => [r.achievement_id, r.current_value]));
  const earnedByAchievementId = new Map((earnedRows ?? []).map((r) => [r.achievement_id, r.earned_at]));

  let totalPoints = 0;
  let earnedCount = 0;

  const items = achievements.map((achievement) => {
    const earnedAt = earnedByAchievementId.get(achievement.id) ?? null;
    const earned = earnedAt !== null;
    if (earned) {
      totalPoints += achievement.point_reward;
      earnedCount += 1;
    }

    return maskIfHidden({
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      tier: achievement.tier,
      targetValue: achievement.target_value,
      pointReward: achievement.point_reward,
      isHidden: achievement.is_hidden,
      earned,
      earnedAt,
      currentValue: progressByAchievementId.get(achievement.id) ?? (earned ? achievement.target_value : 0),
      titleName: extractTitleName(achievement.titles),
    });
  });

  return { items, totalPoints, earnedCount, totalCount: items.length };
}

export interface UnreadAchievement {
  code: string;
  name: string;
  description: string;
  pointReward: number;
  titleName: string | null;
}

interface UnreadAchievementRow {
  achievement_id: string;
  achievements: {
    code: string;
    name: string;
    description: string;
    point_reward: number;
    titles: TitlesRelation;
  } | null;
}

/** 아직 확인하지 않은(is_new) 달성 업적을 가져오고, 조회 즉시 확인 처리한다. */
export async function fetchAndMarkUnreadAchievements(employeeId: string): Promise<UnreadAchievement[]> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_id, achievements(code, name, description, point_reward, titles(name))")
    .eq("employee_id", employeeId)
    .eq("is_new", true);

  const rows = (data ?? []) as unknown as UnreadAchievementRow[];
  if (rows.length === 0) {
    return [];
  }

  await supabase
    .from("user_achievements")
    .update({ is_new: false })
    .eq("employee_id", employeeId)
    .eq("is_new", true);

  return rows
    .filter((row) => row.achievements !== null)
    .map((row) => ({
      code: row.achievements!.code,
      name: row.achievements!.name,
      description: row.achievements!.description,
      pointReward: row.achievements!.point_reward,
      titleName: extractTitleName(row.achievements!.titles),
    }));
}
