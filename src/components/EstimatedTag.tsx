/**
 * 근무시간이 어디서 온 값인지 알려주는 태그.
 * 추정값일 때 ⓘ를 누르면 이유를 펼쳐 보여줍니다 (폰에서는 hover 툴팁이 안 되므로 토글식).
 */

'use client';

import { useState } from 'react';
import type { HoursSource, Job } from '@/types';

const LABEL: Record<HoursSource, string> = {
  OWNER: '확정',
  TEXT: '공고 추정',
  USER: '입력값',
};

const REASON: Record<HoursSource, string> = {
  OWNER: '사장님이 직접 등록한 근무시간이라 그대로 계산했습니다.',
  TEXT:
    '사람인은 근무시간을 따로 주지 않아, 공고 문구("09:00~14:00" 같은 표기)에서 뽑아낸 값입니다. ' +
    '실제와 다를 수 있으니 아래에서 조정해 보세요.',
  USER:
    '사람인 공고는 근무시간 정보를 제공하지 않고 공고 문구에서도 찾지 못해, ' +
    '검색할 때 입력한 값으로 계산했습니다. 아래에서 조정해 보세요.',
};

/** 공고에서 근무시간 출처를 읽습니다. 예전 데이터(hoursSource 없음)도 다룰 수 있게 합니다 */
export function hoursSourceOf(job: Pick<Job, 'hoursIsEstimated' | 'hoursSource'>): HoursSource {
  return job.hoursSource ?? (job.hoursIsEstimated ? 'USER' : 'OWNER');
}

export default function EstimatedTag({
  source,
  /** 이유를 펼칠 수 있게 할지 (카드 안에서는 false로 쓰세요) */
  expandable = false,
}: {
  source: HoursSource;
  expandable?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const tag = (
    <span
      className={`ml-1 rounded px-1 text-[10px] ${
        source === 'OWNER' ? 'bg-blue-50 text-brand' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {LABEL[source]}
    </span>
  );

  if (!expandable) return tag;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label="근무시간이 어디서 온 값인지 보기"
        className="align-middle"
      >
        {tag}
        <span className="ml-0.5 text-[10px] text-gray-400">ⓘ</span>
      </button>
      {open && (
        <p className="mt-2 rounded-lg bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-gray-500">
          {REASON[source]}
        </p>
      )}
    </>
  );
}
