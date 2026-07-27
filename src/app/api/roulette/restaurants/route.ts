import { searchAllRouletteRestaurants, searchRouletteRestaurants } from "@/lib/roulette/restaurant-search";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const filters = {
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    radius: searchParams.get("radius") ?? undefined,
    openNow: searchParams.get("openNow") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  };

  if (searchParams.get("all") === "true") {
    return Response.json({ status: "ready", items: await searchAllRouletteRestaurants(filters) });
  }

  const state = await searchRouletteRestaurants(filters);

  return Response.json(state);
}
