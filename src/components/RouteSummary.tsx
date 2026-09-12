/**
 * 이동 경로 요약 — 편도/왕복 시간과 요금
 * (docs/WIREFRAME.md §4 RouteSummary. 지도 렌더링은 해커톤 범위 밖이라 텍스트로만 보여줍니다)
 */

import type { Route, TransportMode } from '@/types';
import { minutes, won } from '@/lib/format';

const MODE_LABEL: Record<TransportMode, string> = {
  TRANSIT: '🚇 대중교통',
  TAXI: '🚕 택시',
  CAR: '🚗 자가용',
};

export default function RouteSummary({
  route,
  mode = 'TRANSIT',
  subsidyPerDay = 0,
}: {
  route: Route | null;
  mode?: TransportMode;
  /** 하루 교통비 지원액. 있으면 실부담액을 함께 보여줍니다 */
  subsidyPerDay?: number;
}) {
  if (!route) {
    return (
      <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">
        경로 정보 없음 — 실질시급을 계산할 수 없습니다.
      </div>
    );
  }

  const roundTripFare = route.oneWayFare * 2;
  const outOfPocket = Math.max(0, roundTripFare - subsidyPerDay);

  return (
    <div className="rounded-xl border border-gray-200 p-4 text-sm tnum">
      <div className="mb-2 text-xs font-semibold text-gray-500">
        {MODE_LABEL[route.mode ?? mode]} 기준
      </div>
      <Row label="편도 소요시간" value={minutes(route.oneWayMinutes)} />
      <Row label="편도 요금" value={won(route.oneWayFare)} />
      <div className="my-1 border-t border-gray-200" />
      <Row
        label="왕복 합계"
        value={`${minutes(route.oneWayMinutes * 2)} · ${won(roundTripFare)}`}
        strong
      />
      {subsidyPerDay > 0 && (
        <>
          <Row label="− 교통비 지원" value={`−${won(subsidyPerDay)}`} />
          <Row label="실제 내 부담" value={won(outOfPocket)} strong />
        </>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        실시간 교통상황과 환승 도보시간 편차는 반영되지 않은 평시 기준 추정치입니다.
      </p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-gray-600'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
