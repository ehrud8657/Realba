/**
 * 실질시급 + 손실률 배지
 * 소유자: B (프론트 — 검색)
 */

import type { Calc } from '@/types';
import { LOSS_STYLE, lossLevel, percent, won } from '@/lib/format';

export default function RealWageBadge({ calc }: { calc: Calc }) {
  const level = lossLevel(calc.lossRate);
  const sign = calc.lossRate >= 0 ? '−' : '+';

  return (
    <div>
      <div className="text-sm text-gray-400 line-through tnum">
        시급 {won(calc.nominalHourlyWage)}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold tnum">실질 {won(calc.realHourlyWage)}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold tnum ${LOSS_STYLE[level]}`}
        >
          {sign}
          {percent(Math.abs(calc.lossRate))}
        </span>
      </div>
    </div>
  );
}
