import "server-only";

const KAKAO_API_BASE = "https://dapi.kakao.com/v2/local";

// 음식점(FD6), 카페(CE7) — 회사 주변 식당 후보 수집 대상
const CATEGORY_GROUP_CODES = ["FD6", "CE7"] as const;

function kakaoHeaders(): Record<string, string> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다.");
  }
  return { Authorization: `KakaoAK ${key}` };
}

export interface GeocodedAddress {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const url = `${KAKAO_API_BASE}/search/address.json?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: kakaoHeaders() });

  if (!res.ok) {
    throw new Error(`Kakao 주소 검색 실패: ${res.status}`);
  }

  const data = await res.json();
  const first = data.documents?.[0];
  if (!first) {
    return null;
  }

  return { lat: Number(first.y), lng: Number(first.x) };
}

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  phone: string;
  x: string;
  y: string;
  distance?: string;
}

export function filterPlacesWithinRadius(places: KakaoPlace[], radiusM: number): KakaoPlace[] {
  return places.filter((place) => {
    const distance = Number(place.distance);
    return Number.isFinite(distance) && distance <= radiusM;
  });
}

export async function searchPlacesByKeyword(params: {
  query: string;
  lat: number;
  lng: number;
  radiusM: number;
}): Promise<KakaoPlace[]> {
  const url =
    `${KAKAO_API_BASE}/search/keyword.json?query=${encodeURIComponent(params.query)}` +
    `&x=${params.lng}&y=${params.lat}&radius=${params.radiusM}&sort=distance&size=15`;
  const res = await fetch(url, { headers: kakaoHeaders() });
  if (!res.ok) throw new Error(`Kakao 키워드 검색 실패: ${res.status}`);
  const data = await res.json();
  return filterPlacesWithinRadius(data.documents ?? [], params.radiusM);
}

export async function searchNearbyPlaces(params: {
  lat: number;
  lng: number;
  radiusM: number;
}): Promise<KakaoPlace[]> {
  const results: KakaoPlace[] = [];

  for (const groupCode of CATEGORY_GROUP_CODES) {
    let page = 1;

    // Kakao 카테고리 검색은 최대 3페이지(45건)까지만 제공한다.
    while (page <= 3) {
      const url =
        `${KAKAO_API_BASE}/search/category.json` +
        `?category_group_code=${groupCode}` +
        `&x=${params.lng}&y=${params.lat}` +
        `&radius=${params.radiusM}&size=15&page=${page}`;

      const res = await fetch(url, { headers: kakaoHeaders() });
      if (!res.ok) {
        throw new Error(`Kakao 카테고리 검색 실패: ${res.status}`);
      }

      const data = await res.json();
      results.push(...data.documents);

      if (data.meta?.is_end) break;
      page += 1;
    }
  }

  return results;
}

const CATEGORY_KEYWORD_MAP: Array<[string, string]> = [
  ["카페", "카페·간단식"],
  ["패스트푸드", "패스트푸드"],
  ["한식", "한식"],
  ["중식", "중식"],
  ["일식", "일식"],
  ["돈까스", "일식"],
  ["양식", "양식"],
  ["분식", "분식"],
  ["아시아", "아시아 음식"],
  ["베트남", "아시아 음식"],
  ["태국", "아시아 음식"],
];

/** Kakao 카테고리명을 내부 분류로 근사 변환한다(정확한 분류는 관리자가 이후에 수정). */
export function mapKakaoCategory(categoryName: string): string {
  for (const [keyword, mapped] of CATEGORY_KEYWORD_MAP) {
    if (categoryName.includes(keyword)) {
      return mapped;
    }
  }
  return "기타";
}
