/**
 * 실질시급 계산 — 이 서비스의 핵심.
 *
 * 소유자: A (백엔드)
 * 단, B와 C도 이 함수를 **화면에서 직접 import 해서** 씁니다.
 * (근무시간 슬라이더를 움직일 때 서버에 다시 물어보지 않고 바로 계산하기 위해)
 *
 * 이 파일은 fetch도, DB도, React도 쓰지 않는 순수 함수입니다. 그대로 유지하세요.
 *
 *            시급 × 근무시간 − 왕복 교통비
 * 실질시급 = ─────────────────────────────
 *            근무시간 + 왕복 이동시간
 */

import type { Calc, Job, Route } from '@/types';

export interface CalcParams {
  /** 시급(원) */
  hourlyWage: number;
  /** 하루 근무시간 */
  dailyWorkHours: number;
  /** 편도 이동시간(분) */
  oneWayMinutes: number;
  /** 편도 요금(원) */
  oneWayFare: number;
  /** 하루 교통비 지원액(원). 사장님 공고에만 있음 */
  dailySubsidy?: number;
}

export function calcRealWage(params: CalcParams): Calc {
  const {
    hourlyWage,
    dailyWorkHours,
    oneWayMinutes,
    oneWayFare,
    dailySubsidy = 0,
  } = params;

  if (dailyWorkHours <= 0) throw new Error('dailyWorkHours must be > 0');
  if (hourlyWage <= 0) throw new Error('hourlyWage must be > 0');

  // 왕복 기준. 지원금을 빼되 음수는 되지 않게
  const dailyCommuteCost = Math.max(0, oneWayFare * 2 - dailySubsidy);
  const dailyCommuteHours = (oneWayMinutes * 2) / 60;

  const dailyNetPay = hourlyWage * dailyWorkHours - dailyCommuteCost;
  const totalOccupiedHours = dailyWorkHours + dailyCommuteHours;

  const realHourlyWage = Math.round(dailyNetPay / totalOccupiedHours);

  return {
    nominalHourlyWage: hourlyWage,
    realHourlyWage,
    dailyWorkHours,
    dailyNetPay: Math.round(dailyNetPay),
    dailyCommuteCost: Math.round(dailyCommuteCost),
    dailyCommuteHours: round2(dailyCommuteHours),
    totalOccupiedHours: round2(totalOccupiedHours),
    lossRate: (hourlyWage - realHourlyWage) / hourlyWage,
  };
}

/**
 * 공고 + 경로 → 계산. 경로가 없으면 계산도 못 합니다.
 * hoursOverride를 주면 공고의 근무시간 대신 그 값을 씁니다 (상세 화면 슬라이더용).
 */
export function calcForJob(
  job: Job,
  route: Route | null,
  hoursOverride?: number,
): Calc | null {
  if (!route) return null;
  return calcRealWage({
    hourlyWage: job.hourlyWage,
    dailyWorkHours: hoursOverride ?? job.dailyWorkHours,
    oneWayMinutes: route.oneWayMinutes,
    oneWayFare: route.oneWayFare,
    dailySubsidy: job.transportSubsidyPerDay ?? 0,
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/* ────────────────────────────────────────────────────────────
   검산 — 이 값이 안 나오면 코드가 틀린 겁니다.

   calcRealWage({ hourlyWage: 12000, dailyWorkHours: 5,
                  oneWayMinutes: 35, oneWayFare: 1400 })
     → dailyNetPay        57200
     → totalOccupiedHours 6.17
     → realHourlyWage     9276
     → lossRate           0.227

   calcRealWage({ hourlyWage: 10500, dailyWorkHours: 5,
                  oneWayMinutes: 10, oneWayFare: 800 })
     → realHourlyWage     9544

   ★ 시급은 A가 1,500원 높은데 실질시급은 B가 높습니다.
     이 역전이 우리 서비스의 존재 이유이고, 발표의 클라이맥스입니다.
   ──────────────────────────────────────────────────────────── */
