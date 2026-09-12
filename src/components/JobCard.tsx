/**
 * 검색 결과 카드
 * 소유자: B (프론트 — 검색)
 */

import Link from 'next/link';
import type { JobResult } from '@/types';
import { minutes, won } from '@/lib/format';
import RealWageBadge from './RealWageBadge';

interface Props {
  item: JobResult;
  rank: number;
  /** 상세 페이지로 넘길 검색 조건 */
  query: string;
}

export default function JobCard({ item, rank, query }: Props) {
  const { job, route, calc } = item;

  return (
    <Link
      href={`/jobs/${job.id}?${query}`}
      className="block rounded-xl border border-gray-200 p-4 transition hover:border-gray-400"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400 tnum">{rank}위</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            job.source === 'OWNER'
              ? 'border-brand text-brand'
              : 'border-gray-300 text-gray-500'
          }`}
        >
          {job.source === 'OWNER' ? '사장님공고' : '사람인'}
        </span>
      </div>

      <div className="font-semibold leading-snug">{job.title}</div>
      <div className="mt-0.5 text-xs text-gray-500">
        {job.companyName} · {job.address}
      </div>

      <div className="mt-3">
        {calc ? (
          <RealWageBadge calc={calc} />
        ) : (
          <div>
            <div className="text-sm text-gray-400 line-through tnum">시급 {won(job.hourlyWage)}</div>
            <div className="text-sm text-bad">경로를 찾지 못했어요 — 실질시급 계산 불가</div>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 tnum">
        {route && (
          <>
            <span>🚇 편도 {minutes(route.oneWayMinutes)}</span>
            {/* 교통비 지원이 있으면 지원금을 뺀 실부담액을 보여줍니다 */}
            <span>💸 왕복 {won(calc ? calc.dailyCommuteCost : route.oneWayFare * 2)}</span>
          </>
        )}
        <span>
          ⏱ {job.dailyWorkHours}시간
          {job.hoursIsEstimated ? (
            <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-500">추정</span>
          ) : (
            <span className="ml-1 rounded bg-blue-50 px-1 text-[10px] text-brand">확정</span>
          )}
        </span>
      </div>
    </Link>
  );
}
