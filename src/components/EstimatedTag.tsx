/**
 * 근무시간이 추정치인지 확정값인지 알려주는 태그.
 * 추정일 때 ⓘ를 누르면 이유를 펼쳐 보여줍니다 (폰에서는 hover 툴팁이 안 되므로 토글식).
 */

'use client';

import { useState } from 'react';

const REASON =
  '사람인 공고는 근무시간 정보를 제공하지 않아, 공고 문구에서 추정하거나 검색할 때 입력한 값으로 계산했습니다. 아래에서 직접 조정해 보세요.';

export default function EstimatedTag({
  estimated,
  reason = REASON,
  /** 이유를 펼칠 수 있게 할지 (카드 안에서는 false로 쓰세요) */
  expandable = false,
}: {
  estimated: boolean;
  reason?: string;
  expandable?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const tag = (
    <span
      className={`ml-1 rounded px-1 text-[10px] ${
        estimated ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-brand'
      }`}
    >
      {estimated ? '추정' : '확정'}
    </span>
  );

  if (!estimated || !expandable) return tag;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label="근무시간이 추정치인 이유 보기"
        className="align-middle"
      >
        {tag}
        <span className="ml-0.5 text-[10px] text-gray-400">ⓘ</span>
      </button>
      {open && (
        <p className="mt-2 rounded-lg bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-gray-500">
          {reason}
        </p>
      )}
    </>
  );
}
