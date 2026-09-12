/**
 * 정렬 토글 — 시급순 ↔ 실질시급순
 * 소유자: B (프론트 — 검색)
 *
 * ★ 발표의 클라이맥스입니다.
 *   "시급순으로 보면 1등이던 공고가, 실질시급순으로 바꾸면 15등으로 떨어집니다."
 *   이 버튼 하나로 심사위원이 서비스를 즉시 이해합니다. 절대 빼지 마세요.
 */

'use client';

import type { SortKey } from '@/types';

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'REAL_WAGE', label: '실질시급순' },
  { key: 'NOMINAL_WAGE', label: '시급순' },
  { key: 'COMMUTE', label: '이동시간순' },
];

export default function SortToggle({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
            value === o.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
