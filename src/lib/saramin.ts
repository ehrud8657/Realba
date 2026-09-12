/**
 * 사람인 오픈 API — 채용공고 검색
 *
 * 소유자: A (백엔드)
 *
 * ⚠️ 이 코드는 실제 API 응답으로 검증되지 않았습니다.
 *    H+0:30에 브라우저에서 아래 URL을 직접 열어 응답을 확인하고 고치세요.
 *    https://oapi.saramin.co.kr/job-search?access-key=키&keywords=카페&count=10
 *
 * 키 발급: https://oapi.saramin.co.kr  (승인에 시간이 걸릴 수 있으니 미리 신청)
 *
 * ★ 이 API의 가장 큰 제약: 근무시간 정보를 주지 않습니다.
 *   그래서 공고 제목에서 추정하고, 실패하면 사용자가 입력한 값을 씁니다.
 */

import type { Job, LatLng } from '@/types';
import { geocode } from './geocode';

const SARAMIN_KEY = process.env.SARAMIN_ACCESS_KEY;

export function hasSaraminKey() {
  return Boolean(SARAMIN_KEY);
}

export interface SaraminQuery {
  keyword: string;
  /** 근무시간을 못 구했을 때 쓸 기본값 */
  defaultHours: number;
  count?: number;
}

/**
 * 사람인 공고를 Job[] 으로 바꿔서 돌려줍니다.
 * 실패하면 빈 배열 (에러를 던지지 않습니다).
 */
export async function fetchSaraminJobs(q: SaraminQuery): Promise<Job[]> {
  if (!SARAMIN_KEY) return [];

  try {
    const url =
      `https://oapi.saramin.co.kr/job-search` +
      `?access-key=${SARAMIN_KEY}` +
      `&keywords=${encodeURIComponent(q.keyword)}` +
      `&job_type=4` + // 4 = 아르바이트
      `&count=${q.count ?? 20}` +
      `&start=0`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const raw: any[] = data?.jobs?.job ?? [];

    const jobs = await Promise.all(raw.map((r) => toJob(r, q.defaultHours)));
    return jobs.filter((j): j is Job => j !== null);
  } catch {
    return [];
  }
}

/** 사람인 응답 한 건 → 우리 Job 타입 */
async function toJob(raw: any, defaultHours: number): Promise<Job | null> {
  // 응답 필드명에 하이픈이 있어 브래킷 표기를 씁니다 (raw.position['job-type'])
  const title: string = raw?.position?.title ?? '';
  const companyName: string = raw?.company?.detail?.name ?? '이름 없음';
  const address: string = raw?.position?.location?.name ?? '';
  const salaryText: string = raw?.salary?.name ?? '';

  const hourlyWage = parseHourlyWage(salaryText);
  if (!hourlyWage) return null; // "회사내규에 따름" 등 → 계산 불가하므로 제외

  // 사람인은 좌표를 주지 않습니다. 지역 텍스트를 지오코딩합니다
  const location: LatLng | null = await geocode(cleanAddress(address));
  if (!location) return null;

  const estimated = estimateDailyHours(title);

  return {
    id: `saramin-${raw?.id ?? Math.random().toString(36).slice(2)}`,
    source: 'SARAMIN',
    title,
    companyName,
    address: cleanAddress(address),
    location,
    hourlyWage,
    dailyWorkHours: estimated ?? defaultHours,
    hoursIsEstimated: true, // 사람인 공고는 항상 추정입니다
    url: raw?.url ?? null,
  };
}

/** "경기 > 고양시 덕양구" → "경기 고양시 덕양구" */
function cleanAddress(s: string) {
  return s.replace(/\s*>\s*/g, ' ').trim();
}

/**
 * "시급 10,030원" → 10030
 * 시급이 아니면 null (해커톤에서는 시급제 공고만 다룹니다)
 */
export function parseHourlyWage(text: string): number | null {
  const m = text.match(/시급\s*([\d,]+)\s*원?/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 공고 제목에서 하루 근무시간을 추정합니다. 못 구하면 null.
 * 예) "카페 알바 09:00~14:00" → 5 / "주말 4시간 근무" → 4
 */
export function estimateDailyHours(text: string): number | null {
  const range = text.match(
    /(\d{1,2})\s*(?::(\d{2}))?\s*시?\s*[~\-–]\s*(\d{1,2})\s*(?::(\d{2}))?\s*시?/,
  );
  if (range) {
    const start = Number(range[1]) + Number(range[2] ?? 0) / 60;
    let end = Number(range[3]) + Number(range[4] ?? 0) / 60;
    if (end <= start) end += 24; // 자정 넘김
    const h = Math.round((end - start) * 2) / 2;
    if (h > 0 && h <= 14) return h;
  }

  const direct = text.match(/(\d{1,2}(?:\.\d)?)\s*시간/);
  if (direct) {
    const h = Number(direct[1]);
    if (h > 0 && h <= 14) return h;
  }

  return null;
}
