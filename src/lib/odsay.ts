/**
 * ODsay 대중교통 API — 좌표 2개 → 편도 소요시간 + 요금
 *
 * 소유자: A (백엔드)
 *
 * ⚠️ 이 코드는 실제 API 응답으로 검증되지 않았습니다.
 *    H+0:30에 직접 호출해서 응답 구조를 눈으로 확인하세요.
 *
 * 키 발급: https://lab.odsay.com → 회원가입 → API 키 발급
 *
 * ★ 무료 쿼터가 있습니다. 공고 20건 검색 = 호출 20번입니다.
 *   개발 중에는 목데이터를 쓰고, 통합할 때만 실제로 부르세요.
 */

import type { LatLng, Route } from '@/types';

const ODSAY_KEY = process.env.ODSAY_API_KEY;

/** 경로 캐시. 좌표를 소수점 4자리(약 11m)로 반올림해 키를 만들어 적중률을 높입니다 */
const cache = new Map<string, Route | null>();

export function hasOdsayKey() {
  return Boolean(ODSAY_KEY);
}

const routeKey = (o: LatLng, d: LatLng) =>
  `${o.lat.toFixed(4)},${o.lng.toFixed(4)}-${d.lat.toFixed(4)},${d.lng.toFixed(4)}`;

/**
 * 편도 경로를 구합니다. 실패하면 null (에러를 던지지 않습니다).
 * null이 오면 그 공고는 실질시급을 계산하지 않고 목록 맨 뒤로 보냅니다.
 */
export async function getRoute(origin: LatLng, dest: LatLng): Promise<Route | null> {
  const key = routeKey(origin, dest);
  if (cache.has(key)) return cache.get(key)!;
  if (!ODSAY_KEY) return null;

  const route = await callOdsay(origin, dest);
  cache.set(key, route);
  return route;
}

async function callOdsay(o: LatLng, d: LatLng): Promise<Route | null> {
  try {
    // ★ 키는 발급된 값을 그대로 넣습니다. encodeURIComponent를 한 번 더 하면 인증 실패
    const url =
      `https://api.odsay.com/v1/api/searchPubTransPathT` +
      `?apiKey=${ODSAY_KEY}` +
      `&SX=${o.lng}&SY=${o.lat}` +
      `&EX=${d.lng}&EY=${d.lat}` +
      `&OPT=0&SearchPathType=0`;

    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;

    const data = await res.json();

    // 출발지·도착지가 너무 가까우면 경로가 없습니다 → 도보로 처리
    if (data?.error) return walkingFallback(o, d);

    const info = data?.result?.path?.[0]?.info;
    if (!info) return walkingFallback(o, d);

    return {
      oneWayMinutes: Math.round(info.totalTime),
      oneWayFare: Math.round(info.payment ?? 0),
    };
  } catch {
    return null;
  }
}

/** 너무 가까워서 대중교통 경로가 없을 때 — 걸어간다고 보고 추정 */
function walkingFallback(o: LatLng, d: LatLng): Route {
  const km = haversineKm(o, d);
  return {
    oneWayMinutes: Math.max(1, Math.round((km / 4) * 60 * 1.3)), // 시속 4km, 우회계수 1.3
    oneWayFare: 0,
  };
}

/**
 * 플랜 B — ODsay가 아예 안 될 때 쓰는 직선거리 기반 추정.
 * route.ts에서 getRoute()가 null을 주면 이걸로 대체하세요.
 * (→ docs/TEAM.md §7 플랜 B)
 */
export function estimateRoute(o: LatLng, d: LatLng): Route {
  const km = haversineKm(o, d);
  if (km < 1.2) return walkingFallback(o, d);
  return {
    oneWayMinutes: Math.max(5, Math.round((km / 20) * 60)), // 대중교통 평균 시속 20km 가정
    oneWayFare: km < 10 ? 1400 : 1400 + Math.round((km - 10) * 100),
  };
}

/** 두 좌표 사이 직선거리(km) */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
