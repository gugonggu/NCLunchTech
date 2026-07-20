"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao-map/loadKakaoMaps";
import { buildBoundsPoints, computeBounds } from "@/lib/kakao-map/markers";
import { BottomSheet, type SheetSnap } from "./BottomSheet";

export interface MapRestaurant {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number;
  lng: number;
  distanceM: number | null;
  reviewCount?: number;
}

interface CompanyLocation {
  lat: number;
  lng: number;
}

/** KNN타워 기본 좌표(회사 좌표 미설정 시 지도 중심 대체용, 실제 거리 계산에는 쓰이지 않는다). */
const FALLBACK_CENTER = { lat: 35.1685, lng: 129.1298 };

export function RestaurantsMapView({
  restaurants,
  companyLocation,
  forAppointment,
}: {
  restaurants: MapRestaurant[];
  companyLocation: CompanyLocation | null;
  forAppointment?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, kakao.maps.Marker>>(new globalThis.Map());
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("half");

  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps(["clusterer"])
      .then((kakaoSdk) => {
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const center = companyLocation ?? restaurants[0] ?? FALLBACK_CENTER;
        const map = new kakaoSdk.maps.Map(mapContainerRef.current, {
          center: new kakaoSdk.maps.LatLng(center.lat, center.lng),
          level: 5,
        });
        mapRef.current = map;

        if (companyLocation) {
          new kakaoSdk.maps.Marker({
            position: new kakaoSdk.maps.LatLng(companyLocation.lat, companyLocation.lng),
            map,
            title: "회사",
          });
        }

        const markers = restaurants.map((r) => {
          const marker = new kakaoSdk.maps.Marker({
            position: new kakaoSdk.maps.LatLng(r.lat, r.lng),
            title: r.name,
          });
          kakaoSdk.maps.event.addListener(marker, "click", () => {
            setSelectedId(r.id);
            setSheetSnap((prev) => (prev === "peek" ? "half" : prev));
            map.panTo(marker.getPosition());
          });
          markersRef.current.set(r.id, marker);
          return marker;
        });

        if (markers.length > 0) {
          clustererRef.current = new kakaoSdk.maps.MarkerClusterer({
            map,
            markers,
            gridSize: 60,
            minLevel: 6,
            averageCenter: true,
          });
        }

        const boundsPoints = buildBoundsPoints(
          restaurants.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng })),
          companyLocation ? { id: "__company", ...companyLocation } : null
        );
        const bounds = computeBounds(boundsPoints);
        if (bounds) {
          const kakaoBounds = new kakaoSdk.maps.LatLngBounds();
          kakaoBounds.extend(new kakaoSdk.maps.LatLng(bounds.swLat, bounds.swLng));
          kakaoBounds.extend(new kakaoSdk.maps.LatLng(bounds.neLat, bounds.neLng));
          map.setBounds(kakaoBounds);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapError("지도를 불러올 수 없어요. 아래 목록으로 식당을 찾을 수 있어요.");
        }
      });

    return () => {
      cancelled = true;
    };
    // 서버에서 내려준 restaurants/companyLocation은 이 페이지 방문 동안 바뀌지 않는다(검색 조건이
    // 바뀌면 폼이 페이지 자체를 새로 불러온다). 그래서 지도 생성은 최초 마운트 1회로 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectFromList(id: string) {
    setSelectedId(id);
    const marker = markersRef.current.get(id);
    if (marker && mapRef.current) {
      mapRef.current.panTo(marker.getPosition());
    }
  }

  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="absolute inset-0 bg-neutral-100" />

      {mapError && (
        <div className="absolute inset-x-0 top-0 z-20 bg-white px-4 py-3 text-center text-sm text-neutral-600 shadow-sm">
          {mapError}
        </div>
      )}

      <BottomSheet
        snap={sheetSnap}
        onSnapChange={setSheetSnap}
        header={<p className="text-sm font-semibold text-neutral-600">{restaurants.length}개 식당</p>}
      >
        {restaurants.length === 0 ? (
          <p className="text-sm text-neutral-500">조건에 맞는 식당이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {restaurants.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelectFromList(r.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${
                    selectedId === r.id ? "border-brand bg-brand-bg" : "border-neutral-200"
                  }`}
                >
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-neutral-500">
                    {r.category}
                    {r.address && ` · ${r.address}`}
                    {r.distanceM !== null && ` · ${r.distanceM}m`}
                    {!!r.reviewCount && ` · 리뷰 ${r.reviewCount}개`}
                  </p>
                </button>
                <Link
                  href={
                    forAppointment ? `/restaurants/${r.id}?forAppointment=${forAppointment}` : `/restaurants/${r.id}`
                  }
                  className="mt-1 block text-xs text-neutral-400 underline"
                >
                  상세 보기
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </div>
  );
}
