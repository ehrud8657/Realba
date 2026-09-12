/**
 * 계산 과정 분해 카드 — "이 숫자가 어떻게 나왔는지" 보여주는 곳
 * 소유자: C (프론트 — 상세)
 *
 * 심사위원이 "그 숫자 믿을 수 있어요?"라고 물으면 이 화면을 보여주면 됩니다.
 */

import type { Calc } from '@/types';
import { hours, won } from '@/lib/format';

export default function CalcBreakdown({ calc }: { calc: Calc }) {
  const workHours = calc.dailyWorkHours;
  const workPay = calc.nominalHourlyWage * workHours;

  return (
    <div className="rounded-xl border border-gray-200 p-4 text-sm tnum">
      <div className="mb-1 font-semibold">하루 버는 돈</div>
      <Row
        label={`${won(calc.nominalHourlyWage)} × ${workHours}시간`}
        value={won(Math.round(workPay))}
      />
      <Row label="− 왕복 교통비" value={`−${won(calc.dailyCommuteCost)}`} />
      <Divider />
      <Row label="실수령" value={won(calc.dailyNetPay)} strong />

      <div className="mb-1 mt-5 font-semibold">하루 쓰는 시간</div>
      <Row label="근무" value={hours(workHours)} />
      <Row label="+ 왕복 이동" value={hours(calc.dailyCommuteHours)} />
      <Divider />
      <Row label="합계" value={hours(calc.totalOccupiedHours)} strong />

      <div className="mt-5 rounded-lg bg-gray-50 p-3 text-center">
        <div className="text-xs text-gray-500">
          {won(calc.dailyNetPay)} ÷ {calc.totalOccupiedHours}시간
        </div>
        <div className="mt-1 text-xl font-bold">= {won(calc.realHourlyWage)} / 시간</div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${strong ? 'font-bold' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span className={strong ? '' : 'text-gray-900'}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-1 border-t border-gray-200" />;
}
