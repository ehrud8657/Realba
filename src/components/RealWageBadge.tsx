/**
 * 실질시급 + 손실률 (+ 최저임금 경고)  — Figma 시안의 카드 중앙부
 * 소유자: B (프론트 — 검색)
 *
 * 시안 구성:  시급 13,000원(회색)  /  실질 11,741원(굵게) + −9.7%(빨강)
 *
 * 접근성(docs/WIREFRAME.md §5): 색으로만 구분하지 않고 부호·퍼센트를 항상 글자로 병기하고,
 * 숫자 덩어리에는 aria-label로 한 문장을 붙입니다.
 */

import type { Calc } from '@/types';
import { percent, won } from '@/lib/format';
import { isBelowMinimumWage, minimumWage } from '@/lib/minimumWage';

export default function RealWageBadge({ calc }: { calc: Calc }) {
  const loss = calc.lossRate >= 0;
  const sign = loss ? '−' : '+';

  const wageBelowMinimum = isBelowMinimumWage(calc.nominalHourlyWage);
  const realBelowMinimum = calc.realHourlyWage < minimumWage();

  const ariaLabel =
    `실질시급 ${calc.realHourlyWage}원, 표시 시급 ${calc.nominalHourlyWage}원 대비 ` +
    `${percent(Math.abs(calc.lossRate))} ${loss ? '낮음' : '높음'}`;

  return (
    <div>
      <div className="text-[13px] text-ink-soft tnum">시급 {won(calc.nominalHourlyWage)}</div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5" aria-label={ariaLabel}>
        <span className="text-[17px] font-bold text-ink tnum">
          실질 {won(calc.realHourlyWage)}
        </span>
        <span className={`text-[13px] font-bold tnum ${loss ? 'text-bad' : 'text-good'}`}>
          {sign}
          {percent(Math.abs(calc.lossRate))}
        </span>
      </div>

      {calc.includesWeeklyHolidayPay && (
        <div className="mt-1 text-[11px] text-ink-soft tnum">
          주휴수당 {won(calc.dailyHolidayPay)}/일 포함
        </div>
      )}

      {(wageBelowMinimum || realBelowMinimum) && (
        <MinimumWageWarning wageBelowMinimum={wageBelowMinimum} />
      )}
    </div>
  );
}

/** ⚫ 최저임금 경고 — docs/WIREFRAME.md §3 배지 규칙의 네 번째 줄 */
export function MinimumWageWarning({ wageBelowMinimum }: { wageBelowMinimum: boolean }) {
  return (
    <div className="mt-1.5 inline-block rounded-full border border-gray-400 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 tnum">
      ⚫{' '}
      {wageBelowMinimum
        ? `표시 시급이 최저임금(${won(minimumWage())}) 미만`
        : `실질시급이 최저임금(${won(minimumWage())}) 미만`}
    </div>
  );
}
