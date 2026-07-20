/**
 * Kakao Maps JS SDK의 최소 타입 선언. 공식 @types 패키지가 없어서 이 프로젝트가 실제로
 * 쓰는 API 표면만 직접 선언한다(전체 SDK를 타이핑하지 않음).
 */
declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    panTo(latlng: LatLng): void;
    setBounds(bounds: LatLngBounds): void;
    setLevel(level: number): void;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
    title?: string;
    image?: MarkerImage;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  namespace event {
    function addListener(target: Marker | Map, type: string, handler: () => void): void;
  }

  namespace services {
    // 이 프로젝트는 services 라이브러리를 쓰지 않는다(REST API로 대체). 자리표시자.
  }

  namespace clusterer {
    interface MarkerClustererOptions {
      map: Map;
      markers: Marker[];
      gridSize?: number;
      minLevel?: number;
      averageCenter?: boolean;
    }
  }

  class MarkerClusterer {
    constructor(options: clusterer.MarkerClustererOptions);
    clear(): void;
    addMarkers(markers: Marker[]): void;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao?: typeof kakao;
}
