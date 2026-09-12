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
  const configured = Boolean(KAKAO_KEY);
  console.info('[Kakao] 키 설정 여부:', configured);
  return configured;
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

async function search(
  kind: 'address' | 'keyword',
  query: string,
): Promise<LatLng | null> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/${kind}.json?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn('[Kakao] 요청 실패', {
        kind,
        status: res.status,
      });
      return null;
    }

    const data = await res.json();
    const doc = data?.documents?.[0];

    if (!doc) {
      console.info('[Kakao] 검색 결과 없음', { kind });
      return null;
    }

    return { lat: Number(doc.y), lng: Number(doc.x) };
  } catch (error) {
    console.warn('[Kakao] 요청 처리 중 예외', {
      kind,
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return null;
  }
}
/**
 * 플랜 B — 지오코딩이 아예 안 될 때 쓰는 고정 출발지.
 * 홈 화면의 출발지 입력을 드롭다운으로 바꾸고 이 값을 쓰면 됩니다.
 * (→ docs/TEAM.md §7 플랜 B)
 */
export const FALLBACK_ORIGINS: Record<string, LatLng> = {
  신촌역: { lat: 37.5559, lng: 126.9368 },
  강남역: { lat: 37.4979, lng: 127.0276 },
  홍대입구역: { lat: 37.5572, lng: 126.9245 },
  잠실역: { lat: 37.5133, lng: 127.1 },
  서울역: { lat: 37.5547, lng: 126.9707 },
  이대역: { lat: 37.5568, lng: 126.9463 },
  합정역: { lat: 37.5495, lng: 126.9138 },
  건대입구역: { lat: 37.5405, lng: 127.0701 },
  왕십리역: { lat: 37.5613, lng: 127.0379 },
  노원역: { lat: 37.6554, lng: 127.0616 },
  사당역: { lat: 37.4766, lng: 126.9816 },
  구로디지털단지역: { lat: 37.4851, lng: 126.9016 },
  수유역: { lat: 37.6378, lng: 127.0255 },
  목동역: { lat: 37.5262, lng: 126.8752 },
  강북구청: { lat: 37.6397, lng: 127.0257 },
};

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
