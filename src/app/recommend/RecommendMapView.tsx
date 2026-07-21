"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao-map/loadKakaoMaps";
import { buildBoundsPoints, computeBounds } from "@/lib/kakao-map/markers";

export interface RecommendMapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface CompanyLocation {
  lat: number;
  lng: number;
}

/** 추천 결과(메인+대안)와 회사 위치를 보여주는 작은 지도. 클러스터링 없이 최대 몇 개 핀만 찍는다. */
export function RecommendMapView({
  points,
  companyLocation,
}: {
  points: RecommendMapPoint[];
  companyLocation: CompanyLocation | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    let cancelled = false;

    loadKakaoMaps()
      .then((kakaoSdk) => {
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const center = companyLocation ?? points[0];
        const map = new kakaoSdk.maps.Map(mapContainerRef.current, {
          center: new kakaoSdk.maps.LatLng(center.lat, center.lng),
          level: 5,
        });

        if (companyLocation) {
          new kakaoSdk.maps.Marker({
            position: new kakaoSdk.maps.LatLng(companyLocation.lat, companyLocation.lng),
            map,
            title: "회사",
          });
        }

        for (const p of points) {
          new kakaoSdk.maps.Marker({
            position: new kakaoSdk.maps.LatLng(p.lat, p.lng),
            map,
            title: p.name,
          });
        }

        const boundsPoints = buildBoundsPoints(
          points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
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
          setMapError("지도를 불러올 수 없어요.");
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-card border border-line bg-surface-muted sm:h-64 lg:h-72">
      <div ref={mapContainerRef} className="absolute inset-0" />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/90 px-4 text-center text-sm text-ink-muted">
          {mapError}
        </div>
      )}
    </div>
  );
}
