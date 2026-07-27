import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { EVENT_ACHIEVEMENT_CODES, type AchievementEventType } from "./definitions";
import { applyProgressIncrement, applyProgressRecompute } from "./engine";
import { computeRecomputeMetric, RECOMPUTE_METRIC_BY_CODE, type RecomputeMetric } from "./recompute";
import { extractTitleName, type TitlesRelation } from "./title-relation";

export interface EarnedAchievementResult {
  code: string;
  name: string;
  description: string;
  pointReward: number;
  titleName: string | null;
}

interface AchievementRow {
  id: string;
  code: string;
  name: string;
  description: string;
  target_value: number;
  point_reward: number;
  titles: TitlesRelation;
}

/**
 * 원본 기능(방문 완료 등)이 성공한 뒤 호출한다. event_key가 고유 제약이라 같은 요청이
 * 재전송돼도 진행도가 두 번 증가하지 않는다. 반환값은 이번 호출로 "새로 달성한" 업적만 담는다.
 */
export async function recordAchievementEvent(params: {
  employeeId: string;
  eventType: AchievementEventType;
  eventKey: string;
  referenceType?: string;
  referenceId?: string;
  payload?: Record<string, unknown>;
}): Promise<EarnedAchievementResult[]> {
  const codes = EVENT_ACHIEVEMENT_CODES[params.eventType];
  if (!codes || codes.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();

  const { error: insertEventError } = await supabase.from("achievement_events").insert({
    employee_id: params.employeeId,
    event_type: params.eventType,
    event_key: params.eventKey,
    reference_type: params.referenceType ?? null,
    reference_id: params.referenceId ?? null,
    payload: params.payload ?? null,
  });

  if (insertEventError) {
    if (insertEventError.code === "23505") {
      return []; // 같은 이벤트가 이미 처리됨(멱등)
    }
    throw new Error(`업적 이벤트 기록 실패: ${insertEventError.message}`);
  }

  const { data: achievementRows } = await supabase
    .from("achievements")
    .select("id, code, name, description, target_value, point_reward, titles(name)")
    .in("code", codes)
    .eq("is_active", true);

  const achievements = (achievementRows ?? []) as unknown as AchievementRow[];
  if (achievements.length === 0) {
    return [];
  }

  const achievementIds = achievements.map((a) => a.id);

  const [{ data: progressRows }, { data: earnedRows }] = await Promise.all([
    supabase
      .from("user_achievement_progress")
      .select("achievement_id, current_value")
      .eq("employee_id", params.employeeId)
      .in("achievement_id", achievementIds),
    supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("employee_id", params.employeeId)
      .in("achievement_id", achievementIds),
  ]);

  const progressByAchievementId = new Map((progressRows ?? []).map((r) => [r.achievement_id, r.current_value]));
  const earnedAchievementIds = new Set((earnedRows ?? []).map((r) => r.achievement_id));

  const newlyEarned: EarnedAchievementResult[] = [];
  const recomputeMetricCache = new Map<RecomputeMetric, number>();
  async function getRecomputeMetricValue(metric: RecomputeMetric): Promise<number> {
    if (!recomputeMetricCache.has(metric)) {
      recomputeMetricCache.set(metric, await computeRecomputeMetric(params.employeeId, metric));
    }
    return recomputeMetricCache.get(metric)!;
  }

  for (const achievement of achievements) {
    if (earnedAchievementIds.has(achievement.id)) {
      continue;
    }

    const currentValue = progressByAchievementId.get(achievement.id) ?? 0;
    const recomputeMetric = RECOMPUTE_METRIC_BY_CODE[achievement.code];

    const result = recomputeMetric
      ? applyProgressRecompute(
          { achievementId: achievement.id, code: achievement.code, targetValue: achievement.target_value },
          await getRecomputeMetricValue(recomputeMetric),
          currentValue,
          false
        )
      : applyProgressIncrement(
          {
            achievementId: achievement.id,
            code: achievement.code,
            currentValue,
            targetValue: achievement.target_value,
          },
          false
        );

    await supabase.from("user_achievement_progress").upsert(
      {
        employee_id: params.employeeId,
        achievement_id: achievement.id,
        current_value: result.newCurrentValue,
        target_value: achievement.target_value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,achievement_id" }
    );

    if (!result.justEarned) {
      continue;
    }

    const { error: earnedError } = await supabase.from("user_achievements").insert({
      employee_id: params.employeeId,
      achievement_id: achievement.id,
      is_new: true,
    });

    if (earnedError) {
      if (earnedError.code === "23505") {
        continue; // 동시 요청으로 이미 달성 처리됨
      }
      throw new Error(`업적 달성 저장 실패: ${earnedError.message}`);
    }

    newlyEarned.push({
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
      pointReward: achievement.point_reward,
      titleName: extractTitleName(achievement.titles),
    });
  }

  return newlyEarned;
}
