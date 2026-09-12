/**
 * 공고 출처 배지 — 사람인 / 사장님공고
 * (docs/WIREFRAME.md §4 공통 컴포넌트)
 */

import type { JobSource } from '@/types';

export default function SourceBadge({ source }: { source: JobSource }) {
  const owner = source === 'OWNER';
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        owner ? 'border-brand text-brand' : 'border-gray-300 text-gray-500'
      }`}
    >
      {owner ? '사장님공고' : '사람인'}
    </span>
  );
}
