/**
 * 검색 결과 카드 (Figma 시안의 결과 리스트 카드)
 * 소유자: B (프론트 — 검색)
 *
 * 시안 구성
 *   1위  [사장님 공고]
 *   편의점 야간 근무
 *   ○○편의점 신촌점 · 서울 서대문구 창천동
 *   시급 13,000원
 *   실질 11,741원  −9.7%
 *   🚇 편도 20분 · 💸 왕복 1,560원 · ⏱ 6시간
 */

import Link from 'next/link';
import type { JobResult, TransportMode } from '@/types';
import { minutes, won } from '@/lib/format';
import { isBelowMinimumWage } from '@/lib/minimumWage';
import RealWageBadge, { MinimumWageWarning } from './RealWageBadge';
import SourceBadge from './SourceBadge';
import EstimatedTag, { hoursSourceOf } from './EstimatedTag';
import FavoriteButton from './FavoriteButton';

interface Props {
  item: JobResult;
  rank: number;
  /** 상세 페이지로 넘길 검색 조건 */
  query: string;
  /** 찜할 때 함께 남길 검색 조건 */
  origin: string;
  mode: TransportMode;
}

export default function JobCard({ item, rank, query, origin, mode }: Props) {
  const { job, route, calc } = item;

  return (
    <Link
      href={`/jobs/${job.id}?${query}`}
      className="block rounded-card border border-line p-4 transition active:border-ink-soft"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[13px] font-bold text-ink tnum">{rank}위</span>
        <SourceBadge source={job.source} />
        <span className="ml-auto">
          <FavoriteButton job={job} calc={calc} origin={origin} mode={mode} />
        </span>
      </div>

      <div className="text-[15px] font-bold leading-snug text-ink">{job.title}</div>
      <div className="mt-0.5 text-[12px] text-ink-soft">
        {job.companyName} · {job.address}
      </div>

      <div className="mt-2.5">
        {calc ? (
          <RealWageBadge calc={calc} />
        ) : (
          <div>
            <div className="text-[13px] text-ink-soft tnum">시급 {won(job.hourlyWage)}</div>
            <div className="text-[13px] text-bad">경로를 찾지 못했어요 — 실질시급 계산 불가</div>
            {isBelowMinimumWage(job.hourlyWage) && <MinimumWageWarning wageBelowMinimum />}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-soft tnum">
        {route && (
          <>
            <span>🚇 편도 {minutes(route.oneWayMinutes)}</span>
            {/* 교통비 지원이 있으면 지원금을 뺀 실부담액을 보여줍니다 */}
            <span>💸 왕복 {won(calc ? calc.dailyCommuteCost : route.oneWayFare * 2)}</span>
          </>
        )}
        <span>
          ⏱ {job.workTime ? `${job.workTime} ` : ''}
          {job.dailyWorkHours}시간
          <EstimatedTag source={hoursSourceOf(job)} />
        </span>
      </div>
    </Link>
  );
}
