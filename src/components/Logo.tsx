/**
 * 로고 — 파란 라운드 사각형 안의 "R:" 마크와 "Rea:A:ba" 워드마크.
 * (Figma 시안의 logo / 인트로 화면)
 */

export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[22%] bg-brand font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      R:
    </div>
  );
}

export function Wordmark({
  className = '',
  tone = 'dark',
}: {
  className?: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <div className={`wordmark ${tone === 'light' ? 'text-white' : 'text-ink'} ${className}`}>
      Rea:
      <br />
      A:ba
    </div>
  );
}
