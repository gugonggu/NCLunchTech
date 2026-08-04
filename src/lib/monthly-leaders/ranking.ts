import { getSeoulMonthRange, type LeaderboardEmployee, type MonthlyActivities } from "../leaderboard";

export const MONTHLY_LEADER_LABEL = "이달의 리더";

export interface MonthlyLeaderEntry {
  employeeId: string;
  nickname: string;
  reviewScore: number;
  explorerScore: number;
  menuScore: number;
  totalScore: number;
  rank: number;
  isMonthlyLeader: boolean;
}

export function buildMonthlyLeaderEntries(
  employees: LeaderboardEmployee[],
  activities: MonthlyActivities,
  now: Date
) {
  const range = getSeoulMonthRange(now);
  const activeEmployees = employees.filter((employee) => employee.isActive);
  const activeIds = new Set(activeEmployees.map((employee) => employee.id));
  const inMonth = (activity: { employeeId: string; occurredAt: string }) =>
    activeIds.has(activity.employeeId) && activity.occurredAt >= range.start && activity.occurredAt < range.end;

  const reviewScores = new Map<string, number>();
  for (const review of activities.reviews.filter(inMonth)) {
    reviewScores.set(review.employeeId, (reviewScores.get(review.employeeId) ?? 0) + 1);
  }

  const visitedRestaurants = new Map<string, Set<string>>();
  for (const visit of activities.visits.filter(inMonth)) {
    const restaurants = visitedRestaurants.get(visit.employeeId) ?? new Set<string>();
    restaurants.add(visit.restaurantId);
    visitedRestaurants.set(visit.employeeId, restaurants);
  }

  const menuScores = new Map<string, number>();
  for (const record of activities.mealRecords.filter(inMonth)) {
    menuScores.set(record.employeeId, (menuScores.get(record.employeeId) ?? 0) + 1);
  }

  let previousScore: number | null = null;
  let previousRank = 0;
  const entries = activeEmployees
    .map((employee) => {
      const reviewScore = reviewScores.get(employee.id) ?? 0;
      const explorerScore = visitedRestaurants.get(employee.id)?.size ?? 0;
      const menuScore = menuScores.get(employee.id) ?? 0;
      return { employeeId: employee.id, nickname: employee.nickname, reviewScore, explorerScore, menuScore, totalScore: reviewScore + explorerScore + menuScore };
    })
    .filter((entry) => entry.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore || a.nickname.localeCompare(b.nickname, "ko"))
    .map((entry, index) => {
      const rank = entry.totalScore === previousScore ? previousRank : index + 1;
      previousScore = entry.totalScore;
      previousRank = rank;
      return { ...entry, rank, isMonthlyLeader: rank === 1 };
    });

  return { monthKey: range.startDate, entries };
}
