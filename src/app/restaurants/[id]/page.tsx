import Link from "next/link";
import { notFound } from "next/navigation";
import { distanceInMeters } from "@/lib/geo";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, kakao_place_id, name, category, address, phone, lat, lng")
    .eq("id", id)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const { data: settings } = await supabase
    .from("app_settings")
    .select("company_lat, company_lng")
    .eq("id", 1)
    .maybeSingle();

  const distanceM =
    settings?.company_lat && settings?.company_lng
      ? Math.round(
          distanceInMeters(
            { lat: settings.company_lat, lng: settings.company_lng },
            { lat: restaurant.lat, lng: restaurant.lng }
          )
        )
      : null;

  const kakaoMapUrl = `https://place.map.kakao.com/${restaurant.kakao_place_id}`;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <Link href="/restaurants" className="text-sm text-neutral-500">
        ← 목록으로
      </Link>
      <h1 className="text-xl font-bold text-brand-dark">{restaurant.name}</h1>
      <p className="text-neutral-700">{restaurant.category}</p>
      <p className="text-neutral-700">{restaurant.address}</p>
      {restaurant.phone && <p className="text-neutral-700">{restaurant.phone}</p>}
      {distanceM !== null && <p className="text-neutral-700">KNN타워에서 약 {distanceM}m</p>}
      <a
        href={kakaoMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-2xl bg-brand px-4 py-3 text-center font-semibold text-white"
      >
        카카오맵에서 보기
      </a>
    </main>
  );
}
