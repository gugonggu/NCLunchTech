import type { RecommendConditionsInput } from "./validation";

export function buildRecommendQuery(conditions: RecommendConditionsInput): string {
  const params = new URLSearchParams();
  if (conditions.restaurantName) params.set("q", conditions.restaurantName);
  if (conditions.menuName) params.set("menuQ", conditions.menuName);
  if (conditions.category) params.set("category", conditions.category);
  if (conditions.radius !== undefined) params.set("radius", String(conditions.radius));
  if (conditions.maxPriceWon !== undefined) params.set("maxPrice", String(conditions.maxPriceWon));
  if (conditions.excludeRecentVisits) params.set("excludeRecent", "on");
  if (conditions.excludeCongested) params.set("excludeCongested", "on");
  if (conditions.preferFavorites) params.set("preferFavorites", "on");
  if (conditions.preferGoodRating) params.set("preferGoodRating", "on");
  if (conditions.preferFast) params.set("preferFast", "on");
  if (conditions.preferUnvisited) params.set("preferUnvisited", "on");
  return params.toString();
}

export function buildRecommendUrl(conditions: RecommendConditionsInput): string {
  const query = buildRecommendQuery(conditions);
  return query ? `/recommend?${query}` : "/recommend";
}

export function buildRouletteUrl(conditions: RecommendConditionsInput): string {
  const query = buildRecommendQuery(conditions);
  return query ? `/roulette?${query}` : "/roulette";
}
