/** 화면 표시용 포맷 유틸. 누구나 써도 됩니다 */

/** 12000 → "12,000원" */
export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 0.227 → "22.7%" */
export const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

/** 6.1667 → "6.17시간" */
export const hours = (n: number) => `${n.toFixed(2)}시간`;

/** 35 → "35분" / 70 → "1시간 10분" */
export const minutes = (n: number) =>
  n < 60 ? `${n}분` : `${Math.floor(n / 60)}시간 ${n % 60}분`;

/** 손실률 → 배지 색상 (docs/WIREFRAME.md §3 배지 규칙) */
export function lossLevel(lossRate: number): 'good' | 'warn' | 'bad' {
  if (lossRate < 0.1) return 'good';
  if (lossRate < 0.2) return 'warn';
  return 'bad';
}

export const LOSS_STYLE = {
  good: 'text-good bg-green-50 border-green-200',
  warn: 'text-warn bg-amber-50 border-amber-200',
  bad: 'text-bad bg-red-50 border-red-200',
} as const;
