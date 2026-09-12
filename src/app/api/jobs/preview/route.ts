/**
 * POST /api/jobs/preview — 브라우저에 저장된 사장님 공고를 계산해 줍니다
 *
 * 사장님이 올린 공고는 서버에 저장되지 않고 그 사람의 브라우저에만 있습니다.
 * 그래서 화면이 공고를 보내 주면, 서버는 주소를 좌표로 바꾸고 경로·실질시급만 계산해
 * 돌려줍니다. 저장은 하지 않습니다.
 *
 * 쓰는 곳
 *   - 공고 등록 화면의 "구직자에게 이렇게 보입니다" 미리보기
 *   - 검색 결과에 내가 올린 공고를 끼워 넣을 때
 *
 * 요청
 *   { jobs: [...], origin: "신촌역", hours: 5, mode: "TRANSIT" }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Job, JobResult, LatLng, Route, TransportMode } from '@/types';
import { calcForJob } from '@/lib/calc';
import { DEFAULT_ORIGIN_LABEL, FALLBACK_ORIGINS, findFallbackOrigin, geocodeDetailed } from '@/lib/geocode';
import { estimateCar, estimateRoute, estimateTaxi, getRoute, hasOdsayKey } from '@/lib/odsay';

/** 화면에서 보내오는 공고 한 건 */
interface IncomingJob {
  id: string;
  title: string;
  companyName: string;
  address: string;
  hourlyWage: number;
  dailyWorkHours: number;
  workTime?: string;
  workDays?: string;
  transportSubsidyPerDay?: number;
  postedAt?: string;
  deadline?: string;
}

const MAX_JOBS = 20;

export async function POST(req: NextRequest) {
  let body: { jobs?: IncomingJob[]; origin?: string; hours?: number; mode?: TransportMode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ items: [] }, { status: 400 });
  }

  const jobs = (body.jobs ?? []).slice(0, MAX_JOBS);
  if (jobs.length === 0) return NextResponse.json({ items: [] });

  const originQuery = body.origin?.trim() || DEFAULT_ORIGIN_LABEL;
  const mode = body.mode ?? 'TRANSIT';
  const hours = clamp(Number(body.hours) || 5, 1, 14);

  const origin = await resolveOrigin(originQuery);

  const items: JobResult[] = [];
  for (const incoming of jobs) {
    const location = await geocodeAddress(incoming.address);
    if (!location) {
      // 주소를 못 찾으면 계산할 수 없습니다. 화면이 "주소를 확인해 주세요"를 띄웁니다
      items.push({ job: toJob(incoming, { lat: 0, lng: 0 }, hours), route: null, calc: null });
      continue;
    }

    const job = toJob(incoming, location, hours);
    const route = await resolveRoute(origin, location, mode);
    items.push({ job, route, calc: calcForJob(job, route) });
  }

  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}

function toJob(raw: IncomingJob, location: LatLng, fallbackHours: number): Job {
  return {
    id: raw.id,
    source: 'OWNER',
    title: raw.title,
    companyName: raw.companyName,
    address: raw.address,
    location,
    hourlyWage: Math.max(0, Math.round(raw.hourlyWage)),
    dailyWorkHours: clamp(Number(raw.dailyWorkHours) || fallbackHours, 0.5, 14),
    // 사장님이 직접 적은 값이라 확정입니다
    hoursIsEstimated: false,
    hoursSource: 'OWNER',
    url: null,
    transportSubsidyPerDay: Math.max(0, Math.round(raw.transportSubsidyPerDay ?? 0)),
    workTime: raw.workTime,
    workDays: raw.workDays,
    employmentType: '아르바이트',
    postedAt: raw.postedAt,
    deadline: raw.deadline,
  };
}

async function resolveOrigin(query: string): Promise<LatLng> {
  const exact = findFallbackOrigin(query, { loose: false });
  if (exact) return exact.location;

  const found = await geocodeDetailed(query);
  if (found) return found.location;

  const near = findFallbackOrigin(query);
  return near?.location ?? FALLBACK_ORIGINS[DEFAULT_ORIGIN_LABEL];
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  const found = await geocodeDetailed(address);
  return found?.location ?? null;
}

async function resolveRoute(origin: LatLng, dest: LatLng, mode: TransportMode): Promise<Route> {
  if (mode === 'TAXI') return { ...estimateTaxi(origin, dest), mode };
  if (mode === 'CAR') return { ...estimateCar(origin, dest), mode };

  if (hasOdsayKey()) {
    const real = await getRoute(origin, dest);
    if (real) return { ...real, mode };
  }
  return { ...estimateRoute(origin, dest), mode };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
