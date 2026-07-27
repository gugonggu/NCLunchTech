import { searchRouletteRestaurants } from "@/lib/roulette/restaurant-search";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const state = await searchRouletteRestaurants({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    radius: searchParams.get("radius") ?? undefined,
    openNow: searchParams.get("openNow") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  return Response.json(state);
}
