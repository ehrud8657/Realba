/**
 * GET /api/jobs — 이 프로젝트의 유일한 API
 *
 * 소유자: A (백엔드)
 * B, C는 이 파일을 건드리지 말고 응답(JobsResponse)만 쓰세요.
 *
 * 쿼리 파라미터
 *   origin   출발지 (예: "신촌역")
 *   keyword  검색어 (예: "카페")  — 비워도 됨
 *   hours    하루 근무시간 (기본 5)
 *   sort     REAL_WAGE | NOMINAL_WAGE | COMMUTE
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
import { FALLBACK_ORIGINS, geocode, hasGeocodeKey } from '@/lib/geocode';
import { estimateRoute, getRoute, hasOdsayKey } from '@/lib/odsay';
import { fetchSaraminJobs, hasSaraminKey } from '@/lib/saramin';

import mockJobsRaw from '@/data/mockJobs.json';
import ownerJobsRaw from '@/data/ownerJobs.json';

/** 목데이터에만 있는 필드 (외부 API를 붙이면 사라집니다) */
type SeedJob = Job & {
  mockRoute?: Route;
};

const MOCK_JOBS = mockJobsRaw as unknown as SeedJob[];
const OWNER_JOBS = ownerJobsRaw as unknown as SeedJob[];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const originQuery = sp.get('origin')?.trim() || '신촌역';
  const keyword = sp.get('keyword')?.trim() || '';
  const hours = clamp(Number(sp.get('hours')) || 5, 1, 14);
  const sort = (sp.get('sort') as SortKey) || 'REAL_WAGE';
  const mode = (sp.get('mode') as TransportMode) || 'TRANSIT';

  // ── 1. 출발지 좌표 ────────────────────────────────
  const originLocation = await resolveOrigin(originQuery);

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

  // 사람인 공고는 근무시간을 모르므로 사용자가 지정한 값으로 덮어씁니다
  jobs = jobs.map((j) => (j.hoursIsEstimated ? { ...j, dailyWorkHours: hours } : j));

  // ── 3. 경로 + 실질시급 계산 ───────────────────────
  const items: JobResult[] = await Promise.all(
    jobs.map(async (job) => {
      const route = await resolveRoute(originLocation, job, mode);
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
      case 'REAL_WAGE':
      default:
        return b.calc.realHourlyWage - a.calc.realHourlyWage;
    }
  });

  const body: JobsResponse = {
    mode: live ? 'live' : 'mock',
    origin: { label: originQuery, location: originLocation },
    total: items.length,
    items,
  };

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

/** 출발지 문자열 → 좌표. 카카오 키가 없으면 고정 목록에서 찾고, 그래도 없으면 신촌역 */
async function resolveOrigin(query: string): Promise<LatLng> {
  if (FALLBACK_ORIGINS[query]) return FALLBACK_ORIGINS[query];
  if (hasGeocodeKey()) {
    const found = await geocode(query);
    if (found) return found;
  }
  return FALLBACK_ORIGINS['신촌역'];
}

/** 경로 구하기: ODsay → 목데이터 → 직선거리 추정 순으로 시도 */
async function resolveRoute(origin: LatLng, job: SeedJob, mode: TransportMode): Promise<Route | null> {
  if (mode !== 'TRANSIT') {
    const base = job.mockRoute ?? estimateRoute(origin, job.location);
    const factor = mode === 'TAXI' ? 0.65 : 0.8;
    const fare = mode === 'TAXI' ? Math.max(4800, Math.round(base.oneWayFare * 4)) : Math.max(0, Math.round(base.oneWayFare * 1.5));
    return { ...base, oneWayMinutes: Math.max(1, Math.round(base.oneWayMinutes * factor)), oneWayFare: fare, mode };
  }
  if (hasOdsayKey()) {
    const real = await getRoute(origin, job.location);
    if (real) return { ...real, mode };
  }
  if (job.mockRoute) return { ...job.mockRoute, mode };
  return { ...estimateRoute(origin, job.location), mode };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
