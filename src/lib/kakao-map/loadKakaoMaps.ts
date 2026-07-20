"use client";

let loadPromise: Promise<typeof kakao> | null = null;

/**
 * Kakao Maps SDK를 브라우저에 한 번만 로드하는 싱글턴 로더.
 * 여러 지도 컴포넌트가 동시에 마운트돼도 스크립트 태그는 하나만 생성된다.
 * NEXT_PUBLIC_KAKAO_JS_KEY가 없으면 즉시 실패한다(호출부에서 지도 대신 안내 문구를 보여줘야 함).
 */
export function loadKakaoMaps(libraries: string[] = []): Promise<typeof kakao> {
  if (loadPromise) {
    return loadPromise;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!appKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다."));
  }

  loadPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve(window.kakao as typeof kakao);
      return;
    }

    const script = document.createElement("script");
    const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(",")}` : "";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false${librariesParam}`;
    script.async = true;

    script.onload = () => {
      const kakaoGlobal = window.kakao;
      if (!kakaoGlobal) {
        reject(new Error("Kakao SDK 로드에 실패했습니다."));
        return;
      }
      kakaoGlobal.maps.load(() => resolve(kakaoGlobal as typeof kakao));
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Kakao SDK 스크립트를 불러오지 못했습니다."));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
