/**
 * 최저임금 — 연도별 관리
 *
 * README §10: "최저임금은 연도별로 관리합니다. 하드코딩하지 마세요."
 * 완성형에서는 minimum_wages 테이블에서 읽지만, 해커톤에서는 이 표가 그 역할을 합니다.
 * 새 연도가 고시되면 여기에 한 줄만 추가하세요.
 *
 * ⚠️ 2026년 값은 고시안 기준입니다. 제출 전에 최신 고시액을 한 번 확인하세요.
 */

export const MINIMUM_WAGES: Record<number, number> = {
  2024: 9860,
  2025: 10030,
  2026: 10320,
};

/** 해당 연도의 최저임금. 표에 없으면 가장 최근 연도 값을 씁니다 */
export function minimumWage(year: number = new Date().getFullYear()): number {
  if (MINIMUM_WAGES[year]) return MINIMUM_WAGES[year];
  const years = Object.keys(MINIMUM_WAGES).map(Number).sort((a, b) => a - b);
  const latestPast = years.filter((y) => y <= year).pop();
  return MINIMUM_WAGES[latestPast ?? years[years.length - 1]];
}

/** 표시 시급이 최저임금에 못 미치는가 (공고 자체가 위법 소지) */
export function isBelowMinimumWage(hourlyWage: number, year?: number): boolean {
  return hourlyWage < minimumWage(year);
}
