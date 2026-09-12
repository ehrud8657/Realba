/**
 * GET /api/jobs — 이 프로젝트의 유일한 공고 API
 *
 * 소유자: A (백엔드)
 * B, C는 이 파일을 건드리지 말고 응답(JobsResponse)만 쓰세요.
 *
 * 쿼리 파라미터
 *   origin     출발지 (예: "신촌역")
 *   keyword    검색어 (예: "카페")  — 비워도 됨
 *   hours      하루 근무시간 (기본 5)
 *   mode       TRANSIT | TAXI | CAR
 *   sort       REAL_WAGE | NOMINAL_WAGE | COMMUTE | LOSS_RATE | RECENT
 *   limit      최대 건수 (기본 10) — '더 보기'를 누르면 10씩 늘려서 다시 부릅니다
 *   ownerOnly  1이면 사장님 공고만
 *   minWage    1이면 최저임금 이상 공고만
 *   id         공고 ID 한 건만 (상세 화면 전용. 목록 상한과 무관하게 항상 찾아냅니다)
 *
 * ★ 핵심 설계: 외부 API 키가 없어도 목데이터로 정상 동작합니다.
 *   덕분에 B와 C는 A를 기다리지 않고, 키가 안 나와도 데모가 살아남습니다.
 *   (→ docs/TEAM.md §7 플랜 B)
 *
 * 예)  http://localhost:3000/api/jobs?origin=신촌역&keyword=카페&hours=5
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Job, JobResult, JobsResponse, LatLng, Route, SortKey, TransportMode } from '@/types';
import { calcForJob } from '@/lib/calc';
import {
  DEFAULT_ORIGIN_LABEL,
  FALLBACK_ORIGINS,
  findFallbackOrigin,
  geocode,
} from '@/lib/geocode';
import { isBelowMinimumWage } from '@/lib/minimumWage';
import {
  estimateCar,
  estimateRoute,
  estimateTaxi,
  getRoute,
  hasOdsayKey,
  haversineKm,
} from '@/lib/odsay';
import { fetchSaraminJobs, hasSaraminKey } from '@/lib/saramin';

import mockJobsRaw from '@/data/mockJobs.json';
import ownerJobsRaw from '@/data/ownerJobs.json';

/** 목데이터에만 있는 필드 (외부 API를 붙이면 사라집니다) */
type SeedJob = Job & {
  mockRoute?: Route;
};

const MOCK_JOBS = mockJobsRaw as unknown as SeedJob[];
const OWNER_JOBS = ownerJobsRaw as unknown as SeedJob[];

const DEFAULT_LIMIT = 10;

/**
 * 목데이터의 mockRoute는 "신촌역에서 출발했을 때" 기준으로 손으로 넣어둔 값입니다.
 * 그래서 출발지가 신촌역 근처일 때만 쓰고, 멀어지면 좌표 기반 추정으로 바꿉니다.
 * (이걸 안 하면 노원역에서 검색해도 신촌 김밥집이 7분으로 나와 항상 1위가 됩니다)
 */
const MOCK_ROUTE_BASE_ORIGIN = FALLBACK_ORIGINS[DEFAULT_ORIGIN_LABEL];

/** 서울시청 기준 이 반경을 넘으면 "서울 밖"으로 봅니다. 공고가 전부 서울이라 결과가 의미 없습니다 */
const SEOUL_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
const SERVICE_RADIUS_KM = 60;
const MOCK_ROUTE_VALID_RADIUS_KM = 1.5;

function baseRoute(origin: LatLng, job: SeedJob): Route {
  const nearBaseOrigin =
    haversineKm(origin, MOCK_ROUTE_BASE_ORIGIN) <= MOCK_ROUTE_VALID_RADIUS_KM;
  if (job.mockRoute && nearBaseOrigin) return job.mockRoute;
  return estimateRoute(origin, job.location);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const originQuery = sp.get('origin')?.trim() || DEFAULT_ORIGIN_LABEL;
  const keyword = sp.get('keyword')?.trim() || '';
  const hours = clamp(Number(sp.get('hours')) || 5, 1, 14);
  const sort = (sp.get('sort') as SortKey) || 'REAL_WAGE';
  const mode = (sp.get('mode') as TransportMode) || 'TRANSIT';
  const limit = clamp(Number(sp.get('limit')) || DEFAULT_LIMIT, 1, 60);
  const ownerOnly = sp.get('ownerOnly') === '1';
  const aboveMinimumWage = sp.get('minWage') === '1';
  const id = sp.get('id')?.trim() || '';

  // ── 1. 출발지 좌표 ────────────────────────────────
  const origin = await resolveOrigin(originQuery);

  // ── 2. 공고 모으기 (사장님 공고 + 사람인) ──────────
  const live = hasSaraminKey();

  const saraminJobs: SeedJob[] = live
    ? ((await fetchSaraminJobs({ keyword: keyword || '아르바이트', defaultHours: hours })) as SeedJob[])
    : MOCK_JOBS;

  let jobs: SeedJob[] = [...OWNER_JOBS, ...saraminJobs];

  // 키워드 필터 (목데이터일 때만. 사람인은 API가 이미 걸러서 줌)
  if (keyword && !live) {
    const k = keyword.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(k) ||
        j.companyName.toLowerCase().includes(k) ||
        j.address.toLowerCase().includes(k),
    );
  }

  // 상세 화면은 ID로 한 건만 찾습니다. 목록 필터·상한을 적용하면 안 됩니다
  if (id) {
    jobs = jobs.filter((j) => j.id === id);
  } else {
    if (ownerOnly) jobs = jobs.filter((j) => j.source === 'OWNER');
    if (aboveMinimumWage) jobs = jobs.filter((j) => !isBelowMinimumWage(j.hourlyWage));
  }

  // 사람인 공고는 근무시간을 모르므로 사용자가 지정한 값으로 덮어씁니다
  jobs = jobs.map((j) => (j.hoursIsEstimated ? { ...j, dailyWorkHours: hours } : j));

  const total = jobs.length;

  // ── 3. 경로 + 실질시급 계산 ───────────────────────
  // 목데이터는 경로가 로컬이라 전부 계산해도 공짜지만, LIMIT 모드에서는 공고 1건당
  // ODsay를 1번 부릅니다. 그래서 LIVE일 때만 limit까지만 계산합니다 (→ TEAM.md §5 쿼터 주의)
  const candidates = live && !id ? jobs.slice(0, limit) : jobs;

  const items: JobResult[] = await Promise.all(
    candidates.map(async (job) => {
      const route = await resolveRoute(origin.location, job, mode);
      const { mockRoute, ...cleanJob } = job;
      return { job: cleanJob, route, calc: calcForJob(cleanJob, route) };
    }),
  );

  // ── 4. 정렬 ───────────────────────────────────────
  // 계산이 안 된 공고(경로 실패)는 항상 맨 뒤로 보냅니다
  items.sort((a, b) => {
    if (!a.calc && !b.calc) return 0;
    if (!a.calc) return 1;
    if (!b.calc) return -1;

    switch (sort) {
      case 'NOMINAL_WAGE':
        return b.calc.nominalHourlyWage - a.calc.nominalHourlyWage;
      case 'COMMUTE':
        return (a.route?.oneWayMinutes ?? 999) - (b.route?.oneWayMinutes ?? 999);
      case 'LOSS_RATE':
        return a.calc.lossRate - b.calc.lossRate;
      case 'RECENT':
        return (b.job.postedAt ?? '').localeCompare(a.job.postedAt ?? '');
      case 'REAL_WAGE':
      default:
        return b.calc.realHourlyWage - a.calc.realHourlyWage;
    }
  });

  const page = id ? items : items.slice(0, limit);

  const body: JobsResponse = {
    mode: live ? 'live' : 'mock',
    origin: {
      label: originQuery,
      location: origin.location,
      resolved: origin.resolved,
      ...(origin.usedLabel ? { usedLabel: origin.usedLabel } : {}),
      ...(origin.outOfArea ? { outOfArea: true } : {}),
    },
    total,
    limit,
    hasMore: total > page.length,
    items: page,
  };

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * 출발지 문자열 → 좌표.
 * 못 찾으면 기본 출발지로 계산하되 resolved=false를 함께 돌려줍니다.
 * (화면이 "입력한 곳을 못 찾아 신촌역 기준으로 계산했다"고 알려줄 수 있게)
 */
async function resolveOrigin(
  query: string,
): Promise<{ location: LatLng; resolved: boolean; usedLabel?: string; outOfArea?: boolean }> {
  // "안암"처럼 일부만 쳐도 고정 목록에서 찾습니다
  const known = findFallbackOrigin(query);
  if (known) {
    return {
      location: known.location,
      resolved: true,
      // 입력과 다른 이름으로 해석했으면 화면에 알려줍니다
      ...(known.label === query ? {} : { usedLabel: known.label }),
    };
  }

  // 카카오 키가 없어도 OSM으로 찾아봅니다 (→ lib/geocode.ts)
  const found = await geocode(query);
  if (found) {
    return {
      location: found,
      resolved: true,
      outOfArea: haversineKm(found, SEOUL_CENTER) > SERVICE_RADIUS_KM,
    };
  }

  return {
    location: FALLBACK_ORIGINS[DEFAULT_ORIGIN_LABEL],
    resolved: false,
    usedLabel: DEFAULT_ORIGIN_LABEL,
  };
}

/** 경로 구하기: ODsay → 목데이터 → 직선거리 추정 순으로 시도 */
async function resolveRoute(origin: LatLng, job: SeedJob, mode: TransportMode): Promise<Route | null> {
  // 택시·자가용은 대중교통 값에 계수를 곱하지 않고 거리에서 직접 계산합니다
  // (예전에는 대중교통 요금 × 4 였는데, 신촌→강남이 5,600원으로 나와 실제의 1/4이었습니다)
  if (mode === 'TAXI') return { ...estimateTaxi(origin, job.location), mode };
  if (mode === 'CAR') return { ...estimateCar(origin, job.location), mode };
  if (hasOdsayKey()) {
    const real = await getRoute(origin, job.location);
    if (real) return { ...real, mode };
  }
  return { ...baseRoute(origin, job), mode };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
