import { getSeoulMonthRange } from "./leaderboard";

export interface RestaurantOfTheMonthRestaurant {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface RestaurantOfTheMonthActivities {
  visits: Array<{ restaurantId: string; occurredAt: string }>;
  reviews: Array<{ restaurantId: string; tasteRating: number; occurredAt: string }>;
}

export type RestaurantOfTheMonthReason =
  | "most_completed_visits"
  | "highest_taste_rating"
  | "latest_completed_visit"
  | "name_tiebreak";

export interface RestaurantOfTheMonth {
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string;
  completedVisitCount: number;
  averageTasteRating: number | null;
  latestCompletedAt: string;
  selectionReason: RestaurantOfTheMonthReason;
}

interface Candidate extends RestaurantOfTheMonth {
  selectionReason: RestaurantOfTheMonthReason;
}

function compareCandidates(left: Candidate, right: Candidate) {
  return (
    right.completedVisitCount - left.completedVisitCount ||
    (right.averageTasteRating ?? -1) - (left.averageTasteRating ?? -1) ||
    right.latestCompletedAt.localeCompare(left.latestCompletedAt) ||
    left.restaurantName.localeCompare(right.restaurantName, "ko")
  );
}

function selectionReason(winner: Candidate, runnerUp: Candidate | undefined): RestaurantOfTheMonthReason {
  if (!runnerUp || winner.completedVisitCount !== runnerUp.completedVisitCount) return "most_completed_visits";
  if (winner.averageTasteRating !== runnerUp.averageTasteRating) return "highest_taste_rating";
  if (winner.latestCompletedAt !== runnerUp.latestCompletedAt) return "latest_completed_visit";
  return "name_tiebreak";
}

export function selectRestaurantOfTheMonth(
  restaurants: RestaurantOfTheMonthRestaurant[],
  activities: RestaurantOfTheMonthActivities,
  now: Date
): RestaurantOfTheMonth | null {
  const range = getSeoulMonthRange(now);
  const activeRestaurants = new Map(restaurants.filter((restaurant) => restaurant.isActive).map((restaurant) => [restaurant.id, restaurant]));
  const visitsByRestaurant = new Map<string, string[]>();

  for (const visit of activities.visits) {
    if (!activeRestaurants.has(visit.restaurantId) || visit.occurredAt < range.start || visit.occurredAt >= range.end) continue;
    const visits = visitsByRestaurant.get(visit.restaurantId) ?? [];
    visits.push(visit.occurredAt);
    visitsByRestaurant.set(visit.restaurantId, visits);
  }

  const tasteRatingsByRestaurant = new Map<string, number[]>();
  for (const review of activities.reviews) {
    if (!visitsByRestaurant.has(review.restaurantId) || review.occurredAt < range.start || review.occurredAt >= range.end) continue;
    const ratings = tasteRatingsByRestaurant.get(review.restaurantId) ?? [];
    ratings.push(review.tasteRating);
    tasteRatingsByRestaurant.set(review.restaurantId, ratings);
  }

  const candidates = [...visitsByRestaurant].map(([restaurantId, visits]) => {
    const restaurant = activeRestaurants.get(restaurantId)!;
    const ratings = tasteRatingsByRestaurant.get(restaurantId) ?? [];
    return {
      restaurantId,
      restaurantName: restaurant.name,
      restaurantCategory: restaurant.category,
      completedVisitCount: visits.length,
      averageTasteRating: ratings.length === 0 ? null : ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      latestCompletedAt: visits.reduce((latest, occurredAt) => (occurredAt > latest ? occurredAt : latest)),
      selectionReason: "most_completed_visits" as RestaurantOfTheMonthReason,
    };
  });

  candidates.sort(compareCandidates);
  const winner = candidates[0];
  if (!winner) return null;

  return { ...winner, selectionReason: selectionReason(winner, candidates[1]) };
}
