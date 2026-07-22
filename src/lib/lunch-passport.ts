export interface LunchPassportRestaurant {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface LunchPassportVisit {
  restaurantId: string;
  visitedOn: string;
}

export interface PassportRestaurantVisit {
  restaurantId: string;
  restaurantName: string;
  visitCount: number;
  firstVisitedOn: string;
  lastVisitedOn: string;
}

export interface PassportCategory {
  category: string;
  totalRestaurantCount: number;
  visitedRestaurantCount: number;
  completionRate: number;
  restaurants: PassportRestaurantVisit[];
}

export interface LunchPassport {
  totalRestaurantCount: number;
  visitedRestaurantCount: number;
  completionRate: number;
  categories: PassportCategory[];
}

export function buildLunchPassport(
  restaurants: LunchPassportRestaurant[],
  visits: LunchPassportVisit[]
): LunchPassport {
  const activeRestaurants = restaurants.filter((restaurant) => restaurant.isActive);
  const restaurantsById = new Map(activeRestaurants.map((restaurant) => [restaurant.id, restaurant]));
  const visitsByRestaurant = new Map<string, string[]>();

  for (const visit of visits) {
    if (!restaurantsById.has(visit.restaurantId)) continue;
    const dates = visitsByRestaurant.get(visit.restaurantId) ?? [];
    dates.push(visit.visitedOn);
    visitsByRestaurant.set(visit.restaurantId, dates);
  }

  const categories = [...new Set(activeRestaurants.map((restaurant) => restaurant.category))]
    .sort((left, right) => left.localeCompare(right, "ko"))
    .map((category) => {
      const categoryRestaurants = activeRestaurants.filter((restaurant) => restaurant.category === category);
      const visitedRestaurants = categoryRestaurants.flatMap((restaurant) => {
        const dates = visitsByRestaurant.get(restaurant.id);
        if (!dates?.length) return [];
        return [{
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          visitCount: dates.length,
          firstVisitedOn: dates.reduce((first, date) => (date < first ? date : first)),
          lastVisitedOn: dates.reduce((last, date) => (date > last ? date : last)),
        }];
      });

      return {
        category,
        totalRestaurantCount: categoryRestaurants.length,
        visitedRestaurantCount: visitedRestaurants.length,
        completionRate: categoryRestaurants.length === 0 ? 0 : visitedRestaurants.length / categoryRestaurants.length,
        restaurants: visitedRestaurants.sort((left, right) => left.restaurantName.localeCompare(right.restaurantName, "ko")),
      };
    });

  return {
    totalRestaurantCount: activeRestaurants.length,
    visitedRestaurantCount: visitsByRestaurant.size,
    completionRate: activeRestaurants.length === 0 ? 0 : visitsByRestaurant.size / activeRestaurants.length,
    categories,
  };
}
