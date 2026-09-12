/**
 * 실질시급 계산 — 이 서비스의 핵심.
 *
 * 소유자: A (백엔드)
 * 단, B와 C도 이 함수를 **화면에서 직접 import 해서** 씁니다.
 * (근무시간 슬라이더를 움직일 때 서버에 다시 물어보지 않고 바로 계산하기 위해)
 *
 * 이 파일은 fetch도, DB도, React도 쓰지 않는 순수 함수입니다. 그대로 유지하세요.
 *
 *            시급 × 근무시간 + 주휴수당 − 왕복 교통비
 * 실질시급 = ────────────────────────────────────────
 *                   근무시간 + 왕복 이동시간
 */

import type { Calc, Job, Route } from '@/types';

/** 주휴수당 발생 요건 — 주 소정근로시간 15시간 이상 (근로기준법 §55) */
export const WEEKLY_HOLIDAY_PAY_MIN_HOURS = 15;

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
  /** 교통비를 실비 전액 지원하면 true (지원액과 무관하게 교통비 0) */
  fullFareSubsidy?: boolean;
  /** 주휴수당을 급여에 포함할지 */
  includeWeeklyHolidayPay?: boolean;
  /** 주 소정근로시간. 주휴수당 계산에 씁니다 (기본: 일 근무시간 × 5일) */
  weeklyWorkHours?: number;
}

export function calcRealWage(params: CalcParams): Calc {
  const {
    hourlyWage,
    dailyWorkHours,
    oneWayMinutes,
    oneWayFare,
    dailySubsidy = 0,
    fullFareSubsidy = false,
    includeWeeklyHolidayPay = false,
    weeklyWorkHours,
  } = params;

  if (dailyWorkHours <= 0) throw new Error('dailyWorkHours must be > 0');
  if (hourlyWage <= 0) throw new Error('hourlyWage must be > 0');

  // 왕복 기준. 지원금을 빼되 음수는 되지 않게
  const dailyCommuteCost = fullFareSubsidy
    ? 0
    : Math.max(0, oneWayFare * 2 - dailySubsidy);
  const dailyCommuteHours = (oneWayMinutes * 2) / 60;

  const dailyHolidayPay = includeWeeklyHolidayPay
    ? weeklyHolidayPayPerDay(hourlyWage, dailyWorkHours, weeklyWorkHours)
    : 0;

  const dailyNetPay = hourlyWage * dailyWorkHours + dailyHolidayPay - dailyCommuteCost;
  const totalOccupiedHours = dailyWorkHours + dailyCommuteHours;

  const realHourlyWage = Math.round(dailyNetPay / totalOccupiedHours);

  return {
    nominalHourlyWage: hourlyWage,
    realHourlyWage,
    dailyWorkHours,
    dailyNetPay: Math.round(dailyNetPay),
    dailyCommuteCost: Math.round(dailyCommuteCost),
    dailyCommuteHours: round2(dailyCommuteHours),
    dailyHolidayPay: Math.round(dailyHolidayPay),
    includesWeeklyHolidayPay: includeWeeklyHolidayPay && dailyHolidayPay > 0,
    totalOccupiedHours: round2(totalOccupiedHours),
    lossRate: (hourlyWage - realHourlyWage) / hourlyWage,
  };
}

/**
 * 하루치로 환산한 주휴수당.
 *
 *   주휴수당 = (주 소정근로시간 ÷ 40) × 8 × 시급      (주 15시간 미만이면 0)
 *   하루치   = 주휴수당 ÷ 주 근무일수
 */
export function weeklyHolidayPayPerDay(
  hourlyWage: number,
  dailyWorkHours: number,
  weeklyWorkHours?: number,
): number {
  const weekly = weeklyWorkHours ?? dailyWorkHours * 5;
  if (weekly < WEEKLY_HOLIDAY_PAY_MIN_HOURS) return 0;

  // 주 40시간을 넘겨도 주휴수당은 8시간분이 상한입니다
  const weeklyPay = (Math.min(weekly, 40) / 40) * 8 * hourlyWage;
  const workDaysPerWeek = clamp(weekly / dailyWorkHours, 1, 7);
  return weeklyPay / workDaysPerWeek;
}

/** 화면에서 조건을 바꿔볼 때 쓰는 덮어쓰기 값들 */
export interface CalcOverrides {
  /** 공고의 근무시간 대신 쓸 값 (상세 화면 슬라이더) */
  hours?: number;
  /** 공고의 교통비 지원액 대신 쓸 값 */
  subsidyPerDay?: number;
  /** 교통비 실비 전액 지원 */
  fullFareSubsidy?: boolean;
  includeWeeklyHolidayPay?: boolean;
  weeklyWorkHours?: number;
}

/**
 * 공고 + 경로 → 계산. 경로가 없으면 계산도 못 합니다.
 * 세 번째 인자에 숫자를 주면 근무시간만 덮어씁니다 (기존 호출 방식 유지).
 */
export function calcForJob(
  job: Job,
  route: Route | null,
  overrides: number | CalcOverrides = {},
): Calc | null {
  if (!route) return null;

  const o: CalcOverrides = typeof overrides === 'number' ? { hours: overrides } : overrides;

  return calcRealWage({
    hourlyWage: job.hourlyWage,
    dailyWorkHours: o.hours ?? job.dailyWorkHours,
    oneWayMinutes: route.oneWayMinutes,
    oneWayFare: route.oneWayFare,
    dailySubsidy: o.subsidyPerDay ?? job.transportSubsidyPerDay ?? 0,
    fullFareSubsidy: o.fullFareSubsidy ?? false,
    includeWeeklyHolidayPay: o.includeWeeklyHolidayPay ?? false,
    weeklyWorkHours: o.weeklyWorkHours,
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
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

   주휴수당을 켜면 (주 25시간 = 5시간 × 5일)
   calcRealWage({ hourlyWage: 12000, dailyWorkHours: 5, oneWayMinutes: 35,
                  oneWayFare: 1400, includeWeeklyHolidayPay: true })
     → dailyHolidayPay    12000  (= 25/40 × 8 × 12000원 = 주 60,000원 ÷ 주 5일)
     → realHourlyWage     11222
   ──────────────────────────────────────────────────────────── */
