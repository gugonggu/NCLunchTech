export interface AchievementProgressInput {
  achievementId: string;
  code: string;
  currentValue: number;
  targetValue: number;
}

export interface AchievementProgressResult {
  achievementId: string;
  code: string;
  newCurrentValue: number;
  justEarned: boolean;
}

/**
 * 이벤트 1건 발생 시 진행도를 1 증가시키고 목표 달성 여부를 판정한다(순수 함수, DB 접근 없음).
 * 이미 달성한 업적은 진행도를 더 늘리지 않는다(달성 취소 없이 그대로 유지).
 */
export function applyProgressIncrement(
  input: AchievementProgressInput,
  alreadyEarned: boolean
): AchievementProgressResult {
  if (alreadyEarned) {
    return {
      achievementId: input.achievementId,
      code: input.code,
      newCurrentValue: input.currentValue,
      justEarned: false,
    };
  }

  const newCurrentValue = input.currentValue + 1;
  return {
    achievementId: input.achievementId,
    code: input.code,
    newCurrentValue,
    justEarned: newCurrentValue >= input.targetValue,
  };
}

/**
 * "고유 식당/카테고리 수"처럼 이벤트 횟수가 아니라 원본 데이터에서 매번 다시 계산해야 하는
 * 업적용. recomputedValue는 호출 쪽에서 원본(방문 등)을 조회해 이미 계산해 온 절대값이다.
 * 이미 달성한 업적은 캐시값을 그대로 유지한다(재계산으로 값이 줄어도 달성 취소하지 않음).
 */
export function applyProgressRecompute(
  input: Pick<AchievementProgressInput, "achievementId" | "code" | "targetValue">,
  recomputedValue: number,
  previousValue: number,
  alreadyEarned: boolean
): AchievementProgressResult {
  if (alreadyEarned) {
    return {
      achievementId: input.achievementId,
      code: input.code,
      newCurrentValue: previousValue,
      justEarned: false,
    };
  }

  return {
    achievementId: input.achievementId,
    code: input.code,
    newCurrentValue: recomputedValue,
    justEarned: recomputedValue >= input.targetValue,
  };
}
