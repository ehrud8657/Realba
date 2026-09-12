/**
 * 빈 결과 / 에러 공통 표시
 * (docs/WIREFRAME.md §4 공통 컴포넌트)
 */

import type { ReactNode } from 'react';

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-16 text-center">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-[19rem] text-xs leading-relaxed text-gray-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
