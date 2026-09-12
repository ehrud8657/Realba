/**
 * 찜 버튼 ♡ — 카드와 상세에서 같이 씁니다.
 *
 * 카드 안에서는 <Link> 내부에 들어가므로, 누를 때 링크 이동을 막아야 합니다.
 */

'use client';

import type { Calc, Job, TransportMode } from '@/types';
import { toggleFavorite } from '@/lib/account';
import { useAccount } from '@/lib/useAccount';

export default function FavoriteButton({
  job,
  calc,
  origin,
  mode,
  size = 'sm',
}: {
  job: Job;
  calc: Calc | null;
  origin: string;
  mode: TransportMode;
  size?: 'sm' | 'lg';
}) {
  const { favorites } = useAccount();
  const saved = favorites.some((f) => f.jobId === job.id);

  function onClick(e: React.MouseEvent) {
    // 카드 전체가 링크라서 이동을 막습니다
    e.preventDefault();
    e.stopPropagation();

    toggleFavorite({
      jobId: job.id,
      title: job.title,
      companyName: job.companyName,
      address: job.address,
      hourlyWage: job.hourlyWage,
      source: job.source,
      snapshot: calc
        ? {
            realHourlyWage: calc.realHourlyWage,
            lossRate: calc.lossRate,
            hours: calc.dailyWorkHours,
            mode,
            origin,
          }
        : null,
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? '찜 해제' : '찜하기'}
      className={`leading-none transition ${size === 'lg' ? 'text-2xl' : 'text-lg'} ${
        saved ? 'text-bad' : 'text-gray-300 hover:text-ink-soft'
      }`}
    >
      {saved ? '♥' : '♡'}
    </button>
  );
}
