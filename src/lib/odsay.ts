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

/** 이 거리 미만은 걸어간다고 봅니다 */
const WALK_MAX_KM = 0.8;
/** 대중교통 고정비 — 역까지 도보 + 대기 + 환승 (분) */
const TRANSIT_OVERHEAD_MIN = 8;
/** 직선거리를 실제 도로/선로 거리로 바꾸는 우회계수 */
const DETOUR = 1.3;

/** 너무 가까워서 대중교통 경로가 없을 때 — 걸어간다고 보고 추정 */
function walkingFallback(o: LatLng, d: LatLng): Route {
  const km = haversineKm(o, d);
  return {
    oneWayMinutes: Math.max(1, Math.round((km / 4) * 60 * DETOUR)), // 시속 4km
    oneWayFare: 0,
  };
}

/**
 * 플랜 B — ODsay가 아예 안 될 때 쓰는 직선거리 기반 추정.
 * route.ts에서 getRoute()가 null을 주면 이걸로 대체하세요.
 * (→ docs/TEAM.md §7 플랜 B)
 *
 * 고정비 8분을 더하는 이유: 거리만으로 계산하면 짧은 거리가 비현실적으로 짧게 나옵니다.
 * 실제로는 역까지 걷고, 차를 기다리고, 환승하는 시간이 거리와 무관하게 붙습니다.
 *   4km 여의도 → 18분 (체감 20~25분) / 10km 강남 → 33분 (체감 30~35분)
 */
export function estimateRoute(o: LatLng, d: LatLng): Route {
  const km = haversineKm(o, d);
  if (km < WALK_MAX_KM) return walkingFallback(o, d);
  return {
    oneWayMinutes: Math.max(5, Math.round(TRANSIT_OVERHEAD_MIN + (km / 25) * 60)), // 표정속도 25km/h
    oneWayFare: km < 10 ? 1400 : 1400 + Math.round((km - 10) * 100),
  };
}

/**
 * 택시 — 서울 중형택시 기준 (기본요금 4,800원 / 1.6km, 이후 약 131m당 100원).
 *
 * 도로 우회계수는 대중교통보다 큰 1.45를 씁니다(일방통행·좌회전 제약).
 * 정체 구간의 시간요금(시속 15.3km 이하에서 가산)은 거리요금의 15%로 근사했습니다.
 * 그래도 실제보다 10~20% 낮게 나오니, 택시 실질시급은 낙관적인 값으로 보세요.
 */
const TAXI_DETOUR = 1.45;
const TAXI_TIME_SURCHARGE = 1.15;

export function estimateTaxi(o: LatLng, d: LatLng): Route {
  const km = haversineKm(o, d) * TAXI_DETOUR;
  const extra = Math.max(0, km - 1.6);
  const fare = (4800 + extra * 763) * TAXI_TIME_SURCHARGE;
  return {
    oneWayMinutes: Math.max(3, Math.round(3 + (km / 28) * 60)),
    oneWayFare: Math.round(fare / 100) * 100,
  };
}

/**
 * 자가용 — 유류비·통행료를 km당 약 250원으로 보고, 목적지 주차비 2,000원을 더합니다.
 * 시간은 택시와 같은 속도에 주차 탐색 6분을 얹습니다.
 * (사업장 주차 지원이 있으면 상세 화면에서 교통비 지원으로 빼면 됩니다)
 */
export function estimateCar(o: LatLng, d: LatLng): Route {
  const km = haversineKm(o, d) * DETOUR;
  return {
    oneWayMinutes: Math.max(3, Math.round(6 + (km / 28) * 60)),
    oneWayFare: Math.round((km * 250) / 100) * 100 + 2000,
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
