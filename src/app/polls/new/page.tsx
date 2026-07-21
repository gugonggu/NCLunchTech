import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { MAX_POLL_OPTIONS, POLL_STATUS_MESSAGES, isPollStatusCode } from "@/lib/polls/validation";
import { createMenuPoll, createRestaurantPoll } from "./actions";

interface NewPollSearchParams {
  type?: string;
  q?: string;
  restaurantId?: string;
  status?: string;
}

export default async function NewPollPage({
  searchParams,
}: {
  searchParams: Promise<NewPollSearchParams>;
}) {
  const { type, q, restaurantId, status } = await searchParams;

  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent("/polls/new")}`);
  }

  const feedbackMessage = isPollStatusCode(status) ? POLL_STATUS_MESSAGES[status] : null;
  const supabase = createServiceRoleClient();

  if (type !== "restaurant" && type !== "menu") {
    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href="/" className="text-sm text-ink-muted">
          ← 홈으로
        </Link>
        <h1 className="text-xl font-bold text-brand-dark">투표 만들기</h1>
        <div className="flex flex-col gap-3">
          <Link
            href="/polls/new?type=restaurant"
            className="rounded-control bg-brand px-4 py-4 text-center font-semibold text-black"
          >
            식당 투표
          </Link>
          <Link
            href="/polls/new?type=menu"
            className="rounded-control bg-surface px-4 py-4 text-center font-semibold text-brand-dark shadow-card"
          >
            메뉴 투표
          </Link>
        </div>
      </main>
    );
  }

  if (type === "restaurant") {
    const query = q?.trim() ?? "";
    let restaurantsQuery = supabase
      .from("restaurants")
      .select("id, name, category, address")
      .eq("is_active", true)
      .order("name")
      .limit(30);
    if (query) {
      restaurantsQuery = restaurantsQuery.ilike("name", `%${query}%`);
    }
    const { data: restaurants } = await restaurantsQuery;

    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href="/polls/new" className="text-sm text-ink-muted">
          ← 뒤로
        </Link>
        <h1 className="text-xl font-bold text-brand-dark">식당 투표 만들기</h1>
        {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}

        <form method="get" className="flex gap-2">
          <input type="hidden" name="type" value="restaurant" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="식당 이름 검색"
            className="flex-1 rounded-control border border-line px-4 py-3"
          />
          <button type="submit" className="rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold">
            검색
          </button>
        </form>

        <form action={createRestaurantPoll} className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">활성 식당 중 최대 {MAX_POLL_OPTIONS}개까지 고를 수 있어요.</p>

          {(restaurants ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">검색 결과가 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(restaurants ?? []).map((r) => (
                <li key={r.id}>
                  <label className="flex items-center gap-3 rounded-card border border-line px-4 py-3">
                    <input type="checkbox" name="restaurantIds" value={r.id} />
                    <span>
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-sm text-ink-muted">
                        {r.category} · {r.address}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            마감 시각
            <input
              type="datetime-local"
              name="closesAt"
              required
              className="rounded-control border border-line px-4 py-3 text-base text-ink"
            />
          </label>

          <button type="submit" className="rounded-control bg-brand px-4 py-3 font-semibold text-black">
            투표 만들기
          </button>
        </form>
      </main>
    );
  }

  // type === "menu"
  if (!restaurantId) {
    const query = q?.trim() ?? "";
    let restaurantsQuery = supabase
      .from("restaurants")
      .select("id, name, category, address")
      .eq("is_active", true)
      .order("name")
      .limit(30);
    if (query) {
      restaurantsQuery = restaurantsQuery.ilike("name", `%${query}%`);
    }
    const { data: restaurants } = await restaurantsQuery;

    return (
      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href="/polls/new" className="text-sm text-ink-muted">
          ← 뒤로
        </Link>
        <h1 className="text-xl font-bold text-brand-dark">메뉴 투표 만들기</h1>
        {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}
        <p className="text-sm text-ink-muted">먼저 메뉴를 고를 식당을 선택해주세요.</p>

        <form method="get" className="flex gap-2">
          <input type="hidden" name="type" value="menu" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="식당 이름 검색"
            className="flex-1 rounded-control border border-line px-4 py-3"
          />
          <button type="submit" className="rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold">
            검색
          </button>
        </form>

        {(restaurants ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">검색 결과가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(restaurants ?? []).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/polls/new?type=menu&restaurantId=${r.id}`}
                  className="block rounded-card border border-line px-4 py-3"
                >
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-ink-muted">
                    {r.category} · {r.address}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, category")
    .eq("id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    redirect("/polls/new?type=menu&status=inactive_restaurant");
  }

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .eq("restaurant_id", restaurantId)
    .eq("is_sold_out", false)
    .order("name");

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href="/polls/new?type=menu" className="text-sm text-ink-muted">
        ← 다른 식당 고르기
      </Link>
      <h1 className="text-xl font-bold text-brand-dark">메뉴 투표 만들기</h1>
      <p className="text-ink">
        {restaurant.name} · {restaurant.category}
      </p>
      {feedbackMessage && <p className="text-sm text-red-600">{feedbackMessage}</p>}

      <form action={createMenuPoll} className="flex flex-col gap-3">
        <input type="hidden" name="restaurantId" value={restaurant.id} />
        <p className="text-sm text-ink-muted">
          등록 메뉴 선택과 직접 입력을 합쳐서 최대 {MAX_POLL_OPTIONS}개까지 가능해요.
        </p>

        {(menuItems ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">등록된 메뉴가 없어요. 직접 입력만 사용할 수 있어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(menuItems ?? []).map((m) => (
              <li key={m.id}>
                <label className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
                  <span>{m.name}</span>
                  <span className="flex items-center gap-3 text-sm text-ink-muted">
                    {m.price != null ? `${m.price.toLocaleString("ko-KR")}원` : "가격 정보 없음"}
                    <input type="checkbox" name="menuItemIds" value={m.id} />
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted">직접 입력(선택)</p>
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              type="text"
              name="customLabels"
              maxLength={50}
              placeholder="예: 오늘의 특선"
              className="rounded-control border border-line px-4 py-3"
            />
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          마감 시각
          <input
            type="datetime-local"
            name="closesAt"
            required
            className="rounded-control border border-line px-4 py-3 text-base text-ink"
          />
        </label>

        <button type="submit" className="rounded-control bg-brand px-4 py-3 font-semibold text-black">
          투표 만들기
        </button>
      </form>
    </main>
  );
}
