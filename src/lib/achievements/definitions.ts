/**
 * 이벤트 타입 → 업적 코드 매핑. 실제 업적 정의(이름/설명/보상)는 DB(achievements 테이블)가
 * 정본이며, 여기서는 "이 이벤트가 어떤 업적 코드를 검토해야 하는지"만 코드로 관리한다.
 * 새 이벤트를 연결할 때는 이 맵에 항목을 추가한다.
 */
export const EVENT_ACHIEVEMENT_CODES: Record<string, readonly string[]> = {
  VISIT_COMPLETED: [
    "FIRST_VISIT",
    "VISIT_5",
    "VISIT_20",
    "VISIT_50",
    "UNIQUE_RESTAURANT_3",
    "UNIQUE_RESTAURANT_10",
    "UNIQUE_RESTAURANT_20",
    "UNIQUE_CATEGORY_3",
    "UNIQUE_CATEGORY_6",
    "HIDDEN_SAME_RESTAURANT_3_CONSECUTIVE",
  ],
  RECOMMENDATION_CREATED: ["FIRST_RECOMMENDATION"],
  REVIEW_CREATED: ["FIRST_REVIEW", "REVIEW_5", "REVIEW_20"],
  MEAL_GROUP_COMPLETED: ["FIRST_GROUP_MEAL", "GROUP_MEAL_5"],
  // 방장 본인이 만든 약속이 완료됐을 때만 별도로 발생한다(참여자로 완료한 건 세지 않음).
  MEAL_GROUP_HOSTED_COMPLETED: ["HOSTED_GROUP_MEAL_5"],
  // 완료 시점에 본인 포함 4명 이상이 모였을 때만 발생한다(방장/참여자 모두).
  MEAL_GROUP_LARGE_COMPLETED: ["GROUP_SIZE_4"],
  // 중간에 포기한 세션은 이 이벤트가 발생하지 않는다(최종 우승 결정 시점에만 기록).
  WORLDCUP_COMPLETED: ["FIRST_WORLDCUP"],
};

export type AchievementEventType = keyof typeof EVENT_ACHIEVEMENT_CODES;
