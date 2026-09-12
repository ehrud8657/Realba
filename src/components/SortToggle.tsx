/**
 * 정렬 토글 (Figma 시안의 세그먼트 컨트롤 — 실질지급순 / 시급순 / 가까운순)
 * 소유자: B (프론트 — 검색)
 *
 * ★ 발표의 클라이맥스입니다.
 *   "시급순으로 보면 1등이던 공고가, 실질시급순으로 바꾸면 20등으로 떨어집니다."
 *   이 버튼 하나로 심사위원이 서비스를 즉시 이해합니다. 절대 빼지 마세요.
 *
 * 시안은 3개입니다. API는 손실률순·최신순(LOSS_RATE·RECENT)도 지원하지만
 * 세그먼트에 5개를 넣으면 폭 375px에서 글자가 뭉개져 시안대로 3개만 노출합니다.
 */

'use client';

import type { SortKey } from '@/types';

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'REAL_WAGE', label: '실질지급순' },
  { key: 'NOMINAL_WAGE', label: '시급순' },
  { key: 'COMMUTE', label: '가까운순' },
];

export default function SortToggle({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="정렬 기준">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={`rounded-lg py-2 text-[13px] font-semibold transition ${
            value === o.key ? 'bg-ink text-white' : 'bg-gray-100 text-ink-soft'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
