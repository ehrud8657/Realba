/**
 * 로고 — 파란 라운드 사각형 안의 "R:" 마크와 "Rea:A:ba" 워드마크.
 * (Figma 시안의 logo / 인트로 화면)
 */

/**
 * 로고 마크. public/logo.svg와 같은 도형을 인라인으로 그립니다
 * (요청을 한 번 덜 보내고, 어떤 크기에서도 선명합니다)
 */
export function LogoMark({ size = 56, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={rounded ? 'rounded-[22%]' : undefined}
      role="img"
      aria-label="리알바"
    >
      <rect width="128" height="128" fill="#0048CD" />
      <path
        d="M24.2539 100V29.2969H51.9883C68.1016 29.2969 77.2812 38.3789 77.2812 52.3438C77.2812 62.0117 72.8379 69.043 64.7812 72.4609L79.8203 100H63.6094L50.1328 74.9023H38.9023V100H24.2539ZM38.9023 62.9883H49.2539C57.9453 62.9883 62.1445 59.375 62.1445 52.3438C62.1445 45.2148 57.9453 41.3086 49.2539 41.3086H38.9023V62.9883ZM95.6406 91.4062C91.0508 91.4062 87.3398 87.6953 87.4375 83.2031C87.3398 78.7109 91.0508 75.0977 95.6406 75.0977C99.9375 75.0977 103.746 78.7109 103.746 83.2031C103.746 87.6953 99.9375 91.4062 95.6406 91.4062ZM95.6406 54.1992C91.0508 54.1992 87.3398 50.4883 87.4375 45.9961C87.3398 41.5039 91.0508 37.8906 95.6406 37.8906C99.9375 37.8906 103.746 41.5039 103.746 45.9961C103.746 50.4883 99.9375 54.1992 95.6406 54.1992Z"
        fill="white"
      />
    </svg>
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
