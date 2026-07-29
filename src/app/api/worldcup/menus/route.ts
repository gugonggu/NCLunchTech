import { searchWorldcupMenus } from "@/lib/worldcup/menu-search";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const state = await searchWorldcupMenus({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  return Response.json(state);
}
