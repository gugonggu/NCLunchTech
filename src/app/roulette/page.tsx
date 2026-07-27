import { decideRestaurant } from "@/app/visits/actions";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { RouletteWorkspace } from "./RouletteWorkspace";

export default async function RoulettePage() {
  const supabase = createServiceRoleClient();
  const restaurants = await fetchAllRows((from, to) =>
    supabase
      .from("restaurants")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .range(from, to),
  );

  return (
    <main className="flex w-full flex-1 flex-col gap-6">
      <header>
        <p className="text-sm font-semibold text-brand-dark">후보를 직접 구성해 보세요</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">점심 룰렛</h1>
      </header>
      {restaurants.length > 0 ? (
        <RouletteWorkspace initialCandidates={restaurants} decideAction={decideRestaurant} />
      ) : (
        <FeedbackState
          title="활성 식당이 없어요"
          description="관리자에게 식당을 등록하거나 활성화해 달라고 요청해 주세요."
        />
      )}
    </main>
  );
}
