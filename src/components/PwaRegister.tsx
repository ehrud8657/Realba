/**
 * 서비스 워커 등록 — PWA 설치를 가능하게 합니다.
 * layout.tsx에서 한 번만 불러오면 되고, 화면에는 아무것도 그리지 않습니다.
 */

'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // 개발 중에는 등록하지 않습니다 (수정이 바로 반영되도록)
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록에 실패해도 사이트는 정상 동작합니다. 조용히 넘어갑니다.
    });
  }, []);

  return null;
}
