/**
 * 서비스 워커 — 안드로이드 크롬이 "앱으로 설치" 버튼을 띄우게 하려면 이 파일이 필요합니다.
 *
 * ★ 일부러 캐시를 하지 않습니다.
 *   해커톤에서 캐시를 넣으면 "코드를 고쳤는데 폰에서는 옛날 화면이 나와요" 사고가 납니다.
 *   여기서는 설치만 되게 하고, 네트워크는 그대로 통과시킵니다.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// fetch 리스너가 존재해야 설치 조건을 만족합니다. 가로채지 않고 그냥 통과시킵니다.
self.addEventListener('fetch', () => {});
