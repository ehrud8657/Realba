/**
 * 카카오 로컬 API — 주소/장소명 → 좌표
 *
 * 소유자: A (백엔드)
 *
 * ⚠️ 이 코드는 실제 API 응답으로 검증되지 않았습니다.
 *    H+0:30에 키를 받고 제일 먼저 이 함수부터 직접 호출해 보세요.
 *    응답이 다르면 이 파일만 고치면 됩니다.
 *
 * 키 발급: https://developers.kakao.com → 앱 생성 → REST API 키
 */

import type { LatLng } from '@/types';

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

/** 지오코딩 결과 캐시 (서버가 살아있는 동안만 유지). DB 대신 쓰는 것 */
const cache = new Map<string, LatLng | null>();

export function hasGeocodeKey() {
  return Boolean(KAKAO_KEY);
}

/**
 * "신촌역", "서울 서대문구 연희로 10" 같은 문자열을 좌표로 바꿉니다.
 * 실패하면 null을 돌려줍니다. (에러를 던지지 않습니다 — 한 건 실패가 전체를 죽이면 안 됨)
 */
export async function geocode(query: string): Promise<LatLng | null> {
  const key = query.trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  if (!KAKAO_KEY) return null;

  const result = (await search('address', key)) ?? (await search('keyword', key));
  cache.set(key, result);
  return result;
}

async function search(kind: 'address' | 'keyword', query: string): Promise<LatLng | null> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/${kind}.json?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const doc = data?.documents?.[0];
    if (!doc) return null;

    // ★ 주의: 카카오는 x가 경도(lng), y가 위도(lat)입니다. 반대로 쓰면 엉뚱한 곳이 나옵니다
    return { lat: Number(doc.y), lng: Number(doc.x) };
  } catch {
    return null;
  }
}

/**
 * 플랜 B — 지오코딩이 아예 안 될 때 쓰는 고정 출발지.
 * 홈 화면의 출발지 입력을 드롭다운으로 바꾸고 이 값을 쓰면 됩니다.
 * (→ docs/TEAM.md §7 플랜 B)
 */
export const FALLBACK_ORIGINS: Record<string, LatLng> = {
  // 서대문·마포·은평 (신촌 생활권)
  신촌역: { lat: 37.5559, lng: 126.9368 },
  이대역: { lat: 37.5568, lng: 126.9463 },
  홍제역: { lat: 37.5891, lng: 126.944 },
  홍대입구역: { lat: 37.5572, lng: 126.9245 },
  합정역: { lat: 37.5495, lng: 126.9138 },
  공덕역: { lat: 37.5443, lng: 126.9515 },
  연신내역: { lat: 37.6191, lng: 126.9211 },
  불광역: { lat: 37.6106, lng: 126.9298 },

  // 종로·중구·용산
  종각역: { lat: 37.5703, lng: 126.9829 },
  광화문역: { lat: 37.5716, lng: 126.9766 },
  시청역: { lat: 37.5657, lng: 126.977 },
  을지로입구역: { lat: 37.566, lng: 126.9827 },
  서울역: { lat: 37.5547, lng: 126.9707 },
  용산역: { lat: 37.5299, lng: 126.9646 },
  이태원역: { lat: 37.5345, lng: 126.9946 },

  // 성동·광진·동대문·중랑
  왕십리역: { lat: 37.5613, lng: 127.0379 },
  성수역: { lat: 37.5447, lng: 127.0557 },
  건대입구역: { lat: 37.5405, lng: 127.0701 },
  강변역: { lat: 37.535, lng: 127.0947 },
  청량리역: { lat: 37.58, lng: 127.047 },
  회기역: { lat: 37.5894, lng: 127.0577 },
  상봉역: { lat: 37.5966, lng: 127.0854 },
  면목역: { lat: 37.5885, lng: 127.0874 },

  // 성북·강북·도봉·노원
  안암역: { lat: 37.5861, lng: 127.0294 },
  성신여대입구역: { lat: 37.5926, lng: 127.0164 },
  수유역: { lat: 37.6378, lng: 127.0255 },
  미아역: { lat: 37.6266, lng: 127.0261 },
  강북구청: { lat: 37.6397, lng: 127.0257 },
  창동역: { lat: 37.653, lng: 127.0475 },
  쌍문역: { lat: 37.6484, lng: 127.0345 },
  노원역: { lat: 37.6554, lng: 127.0616 },
  공릉역: { lat: 37.6255, lng: 127.073 },

  // 강서·양천·구로·금천·영등포·동작·관악
  마곡나루역: { lat: 37.5673, lng: 126.8259 },
  화곡역: { lat: 37.5416, lng: 126.8402 },
  목동역: { lat: 37.5262, lng: 126.8752 },
  오목교역: { lat: 37.5243, lng: 126.8752 },
  신도림역: { lat: 37.5088, lng: 126.8912 },
  구로디지털단지역: { lat: 37.4851, lng: 126.9016 },
  가산디지털단지역: { lat: 37.4816, lng: 126.8826 },
  영등포역: { lat: 37.5158, lng: 126.9075 },
  여의도역: { lat: 37.5216, lng: 126.9243 },
  노량진역: { lat: 37.514, lng: 126.9422 },
  사당역: { lat: 37.4766, lng: 126.9816 },
  신림역: { lat: 37.4842, lng: 126.9296 },
  서울대입구역: { lat: 37.4812, lng: 126.9526 },

  // 서초·강남·송파·강동
  교대역: { lat: 37.4936, lng: 127.0143 },
  고속터미널역: { lat: 37.5049, lng: 127.0048 },
  강남역: { lat: 37.4979, lng: 127.0276 },
  선릉역: { lat: 37.5045, lng: 127.049 },
  삼성역: { lat: 37.5089, lng: 127.0632 },
  잠실역: { lat: 37.5133, lng: 127.1 },
  가락시장역: { lat: 37.4926, lng: 127.1182 },
  천호역: { lat: 37.5385, lng: 127.1237 },
  강동역: { lat: 37.535, lng: 127.1327 },

  // 대학가 — 학생이 학교 이름으로 검색하는 경우가 많아 별칭으로 넣어 둡니다
  연세대: { lat: 37.5665, lng: 126.9388 },
  이화여대: { lat: 37.5619, lng: 126.9468 },
  고려대: { lat: 37.5894, lng: 127.0327 },
  서울대: { lat: 37.4601, lng: 126.952 },
  한양대: { lat: 37.5574, lng: 127.0451 },
  중앙대: { lat: 37.5049, lng: 126.9573 },
  홍익대: { lat: 37.5509, lng: 126.9254 },
  건국대: { lat: 37.5419, lng: 127.0794 },
};

/**
 * 고정 출발지에서 찾기. "안암역"은 물론 "안암"처럼 일부만 쳐도 찾습니다.
 * 카카오 키가 없을 때 이 목록이 사실상 검색 가능한 출발지 전부입니다.
 */
export function findFallbackOrigin(query: string): { label: string; location: LatLng } | null {
  const q = query.trim();
  if (!q) return null;
  if (FALLBACK_ORIGINS[q]) return { label: q, location: FALLBACK_ORIGINS[q] };
  if (q.length < 2) return null;

  const hit = Object.keys(FALLBACK_ORIGINS).find((name) => name.includes(q) || q.includes(name));
  return hit ? { label: hit, location: FALLBACK_ORIGINS[hit] } : null;
}

/** 키가 없을 때 쓰는 기본 출발지 (플랜 B) */
export const DEFAULT_ORIGIN_LABEL = '신촌역';

/** 출발지 자동완성 한 건 */
export interface PlaceSuggestion {
  /** 화면에 굵게 보이는 이름 */
  label: string;
  /** 보조로 보여주는 주소. 없을 수도 있습니다 */
  address?: string;
  location: LatLng;
}

/**
 * 출발지 자동완성.
 * 카카오 키가 있으면 실제 검색 결과를, 없으면 FALLBACK_ORIGINS 안에서 찾아 돌려줍니다.
 * (그래서 키가 하나도 없어도 자동완성이 '동작하는 것처럼' 보입니다 — 데모가 안 끊깁니다)
 */
export async function suggestPlaces(query: string, limit = 5): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  if (KAKAO_KEY) {
    const live = await searchMany(q, limit);
    if (live.length) return live;
  }

  return Object.entries(FALLBACK_ORIGINS)
    .filter(([name]) => name.includes(q) || q.includes(name))
    .slice(0, limit)
    .map(([name, location]) => ({ label: name, location }));
}

async function searchMany(query: string, limit: number): Promise<PlaceSuggestion[]> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?size=${limit}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const docs: any[] = data?.documents ?? [];
    return docs.map((d) => ({
      label: d.place_name as string,
      address: (d.road_address_name || d.address_name) as string | undefined,
      // ★ 카카오는 x가 경도(lng), y가 위도(lat)
      location: { lat: Number(d.y), lng: Number(d.x) },
    }));
  } catch {
    return [];
  }
}
