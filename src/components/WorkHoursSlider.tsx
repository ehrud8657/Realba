/**
 * 하루 근무시간 슬라이더 — 홈과 상세에서 같은 모양으로 씁니다.
 * (docs/WIREFRAME.md §4 공통 컴포넌트 / §5 접근성: 방향키로 0.5시간 단위 조작)
 */

'use client';

export default function WorkHoursSlider({
  value,
  onChange,
  label = '하루 근무시간',
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label} — <span className="tnum">{value.toFixed(1)}</span>시간
      </label>
      <input
        type="range"
        min={1}
        max={12}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
        aria-label={`${label} ${value.toFixed(1)}시간`}
        aria-valuetext={`${value.toFixed(1)}시간`}
      />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
