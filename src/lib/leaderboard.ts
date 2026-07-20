export interface LeaderboardEmployee {
  id: string;
  nickname: string;
  isActive: boolean;
}

interface TimedActivity {
  employeeId: string;
  occurredAt: string;
}

interface VisitActivity extends TimedActivity {
  restaurantId: string;
}

export interface MonthlyActivities {
  reviews: TimedActivity[];
  visits: VisitActivity[];
  mealRecords: TimedActivity[];
}

export interface RankedEmployee {
  employeeId: string;
  nickname: string;
  score: number;
  rank: number;
}

interface CategoryResult {
  leaders: RankedEmployee[];
  myRank: { score: number; rank: number } | null;
}

export function getSeoulMonthRange(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`);

  return {
    label: `${year}년 ${month}월`,
    start: start.toISOString(),
    end: end.toISOString(),
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

function rankScores(
  employees: LeaderboardEmployee[],
  scores: Map<string, number>,
  currentEmployeeId: string
): CategoryResult {
  let previousScore: number | null = null;
  let previousRank = 0;
  const ranked = employees
    .filter((employee) => employee.isActive)
    .map((employee) => ({ employee, score: scores.get(employee.id) ?? 0 }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.employee.nickname.localeCompare(b.employee.nickname, "ko"))
    .map((row, index) => {
      const rank = row.score === previousScore ? previousRank : index + 1;
      previousScore = row.score;
      previousRank = rank;
      return { employeeId: row.employee.id, nickname: row.employee.nickname, score: row.score, rank };
    });
  const mine = ranked.find((row) => row.employeeId === currentEmployeeId);

  return {
    leaders: ranked.filter((row) => row.rank <= 3),
    myRank: mine ? { score: mine.score, rank: mine.rank } : null,
  };
}

export function buildMonthlyLeaderboard(
  employees: LeaderboardEmployee[],
  activities: MonthlyActivities,
  currentEmployeeId: string,
  now: Date
) {
  const range = getSeoulMonthRange(now);
  const activeIds = new Set(employees.filter((employee) => employee.isActive).map((employee) => employee.id));
  const inMonth = (activity: TimedActivity) =>
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
  const explorerScores = new Map(
    [...visitedRestaurants].map(([employeeId, restaurants]) => [employeeId, restaurants.size])
  );

  const menuScores = new Map<string, number>();
  for (const record of activities.mealRecords.filter(inMonth)) {
    menuScores.set(record.employeeId, (menuScores.get(record.employeeId) ?? 0) + 1);
  }

  return {
    label: range.label,
    categories: {
      review: rankScores(employees, reviewScores, currentEmployeeId),
      explorer: rankScores(employees, explorerScores, currentEmployeeId),
      menu: rankScores(employees, menuScores, currentEmployeeId),
    },
  };
}
