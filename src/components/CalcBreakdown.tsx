/**
 * 계산 과정 분해 — "이 숫자가 어떻게 나왔는지" 보여주는 곳
 * 소유자: C (프론트 — 상세)
 *
 * 심사위원이 "그 숫자 믿을 수 있어요?"라고 물으면 이 화면을 보여주면 됩니다.
 *
 * Figma 시안의 상세 화면 구성을 따릅니다.
 *   일일 소득      13,000원 × 6시간 = 78,000원 / − 왕복 교통비 −1,600원 / 실수령 76,400원
 *   일일 소비 시간  근무 6.00시간 / + 왕복 이동 0.40시간 / 합계 6.40시간
 *   결과 박스      76,400원 ÷ 6.4시간 = 11,938원 / 시간
 */

import type { Calc } from '@/types';
import { hours, won } from '@/lib/format';

export default function CalcBreakdown({ calc }: { calc: Calc }) {
  const workHours = calc.dailyWorkHours;
  const workPay = calc.nominalHourlyWage * workHours;

  return (
    <div className="text-sm tnum">
      <div className="mb-1.5 text-[13px] font-bold text-ink">일일 소득</div>
      <Row
        label={`${won(calc.nominalHourlyWage)} × ${workHours}시간`}
        value={won(Math.round(workPay))}
      />
      {calc.includesWeeklyHolidayPay && (
        <Row label="+ 주휴수당 (하루치)" value={`+${won(calc.dailyHolidayPay)}`} />
      )}
      <Row label="− 왕복 교통비" value={`−${won(calc.dailyCommuteCost)}`} negative />
      <Divider />
      <Row label="실수령" value={won(calc.dailyNetPay)} strong />

      <div className="mb-1.5 mt-6 text-[13px] font-bold text-ink">일일 소비 시간</div>
      <Row label="근무" value={hours(workHours)} />
      <Row label="+ 왕복 이동" value={hours(calc.dailyCommuteHours)} />
      <Divider />
      <Row label="합계 ⏱" value={hours(calc.totalOccupiedHours)} strong />

      <div className="mt-6 rounded-card border border-line px-4 py-3.5 text-center">
        <div className="text-[11px] text-ink-soft">
          {won(calc.dailyNetPay)} ÷ {calc.totalOccupiedHours}시간
        </div>
        <div className="mt-1 text-[19px] font-bold text-ink">
          = {won(calc.realHourlyWage)} / 시간
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  negative,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex justify-between py-1 ${strong ? 'font-bold text-ink' : 'text-ink-soft'}`}>
      <span>{label}</span>
      <span className={negative ? 'text-bad' : strong ? '' : 'text-ink'}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-1 border-t border-line" />;
}
