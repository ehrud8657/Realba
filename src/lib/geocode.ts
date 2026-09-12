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
};
