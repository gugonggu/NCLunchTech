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

export interface RestaurantsPagination {
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
}

/** KNN타워 기본 좌표(회사 좌표 미설정 시 지도 중심 대체용, 실제 거리 계산에는 쓰이지 않는다). */
const FALLBACK_CENTER = { lat: 35.1685, lng: 129.1298 };

export function RestaurantsMapView({
  restaurants,
  companyLocation,
  forAppointment,
  pagination = null,
}: {
  restaurants: MapRestaurant[];
  companyLocation: CompanyLocation | null;
  forAppointment?: string;
  pagination?: RestaurantsPagination | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, kakao.maps.Marker>>(new globalThis.Map());
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
  const listItemRefs = useRef<globalThis.Map<string, HTMLAnchorElement>>(new globalThis.Map());

  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("half");

  function scrollListItemIntoView(id: string) {
    // 시트가 hidden/peek였다면 half로 펼쳐지는 애니메이션이 끝난 뒤에 스크롤해야
    // 목록 영역이 실제로 보이는 상태에서 스크롤이 먹힌다.
    window.setTimeout(() => {
      listItemRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 320);
  }

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
            setSheetSnap((prev) => (prev === "hidden" || prev === "peek" ? "half" : prev));
            map.panTo(marker.getPosition());
            scrollListItemIntoView(r.id);
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

  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="absolute inset-0 bg-surface-muted" />

      {mapError && (
        <div className="absolute inset-x-0 top-0 z-20 bg-surface px-4 py-3 text-center text-sm text-ink-muted shadow-card">
          {mapError}
        </div>
      )}

      {sheetSnap === "hidden" && (
        <button
          type="button"
          onClick={() => setSheetSnap("half")}
          aria-controls="restaurant-results-sheet"
          aria-expanded="false"
          className="absolute bottom-4 right-4 z-20 min-h-11 min-w-11 rounded-control bg-surface px-4 text-sm font-semibold text-ink shadow-float"
        >
          식당 목록 열기
        </button>
      )}

      <BottomSheet
        snap={sheetSnap}
        onSnapChange={setSheetSnap}
        header={<p className="text-sm font-semibold text-ink-muted">{restaurants.length}개 식당</p>}
      >
        {restaurants.length === 0 ? (
          <p className="text-sm text-ink-muted">조건에 맞는 식당이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {restaurants.map((r) => (
              <li key={r.id}>
                <Link
                  ref={(el) => {
                    if (el) listItemRefs.current.set(r.id, el);
                    else listItemRefs.current.delete(r.id);
                  }}
                  href={
                    forAppointment ? `/restaurants/${r.id}?forAppointment=${forAppointment}` : `/restaurants/${r.id}`
                  }
                  className={`block w-full rounded-card px-4 py-4 text-left transition active:scale-[0.98] ${
                    selectedId === r.id ? "border border-brand bg-brand-bg" : "bg-surface shadow-card"
                  }`}
                >
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm tabular-nums text-ink-muted">
                    {r.category}
                    {r.address && ` · ${r.address}`}
                    {r.distanceM !== null && ` · ${r.distanceM}m`}
                    {!!r.reviewCount && ` · 리뷰 ${r.reviewCount}개`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pagination && (
          <nav aria-label="식당 목록 페이지" className="mt-3 flex items-center justify-between gap-3">
            {pagination.prevHref ? (
              <Link href={pagination.prevHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline">
                이전
              </Link>
            ) : (
              <span aria-disabled="true" className="inline-flex min-h-11 items-center text-sm text-ink-muted">
                이전
              </span>
            )}
            <p className="text-sm tabular-nums text-ink-muted">
              {pagination.page}/{pagination.totalPages}페이지
            </p>
            {pagination.nextHref ? (
              <Link href={pagination.nextHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline">
                다음
              </Link>
            ) : (
              <span aria-disabled="true" className="inline-flex min-h-11 items-center text-sm text-ink-muted">
                다음
              </span>
            )}
          </nav>
        )}
      </BottomSheet>
    </div>
  );
}
