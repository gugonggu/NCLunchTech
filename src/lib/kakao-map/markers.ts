export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface LatLngBoundsPlain {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/** 여러 좌표를 모두 포함하는 최소 사각 범위를 계산한다(지도 초기 시야 맞추기용). 좌표가 없으면 null. */
export function computeBounds(points: MapPoint[]): LatLngBoundsPlain | null {
  if (points.length === 0) {
    return null;
  }

  let swLat = points[0].lat;
  let neLat = points[0].lat;
  let swLng = points[0].lng;
  let neLng = points[0].lng;

  for (const p of points) {
    swLat = Math.min(swLat, p.lat);
    neLat = Math.max(neLat, p.lat);
    swLng = Math.min(swLng, p.lng);
    neLng = Math.max(neLng, p.lng);
  }

  return { swLat, swLng, neLat, neLng };
}

/** 회사 위치까지 포함해 지도 시야에 맞출 좌표 목록을 만든다(중복 좌표 방지는 하지 않음 — 지도 SDK가 알아서 처리). */
export function buildBoundsPoints(restaurants: MapPoint[], companyLocation: MapPoint | null): MapPoint[] {
  return companyLocation ? [...restaurants, companyLocation] : restaurants;
}
