# 진짜시급 (RealWage)

> **시급만 보고 알바를 고르면 손해입니다.**
> 교통비와 출퇴근 시간까지 반영한 **실질시급**으로 알바 공고를 비교하는 서비스.

사람인 채용 API로 수집한 공고와 사장님이 직접 등록한 모집공고를 한곳에 모아,
사용자가 **출발지 → 근무지** 경로를 입력하면 대중교통 소요시간·요금을 자동으로 계산해
공고마다 "실제로 손에 쥐는 시간당 금액"을 보여줍니다.

> ## 🏁 해커톤 팀원이라면 여기부터
> 이 README와 `DATABASE.md`, `DEVELOPMENT_GUIDE.md`는 **완성형 설계서**입니다.
> **10시간 해커톤에서는 이 범위를 다 만들 수 없습니다.**
>
> 👉 **[docs/TEAM.md](docs/TEAM.md) 를 먼저 읽으세요.** (팀 전원, 15분)
> 축소된 범위 · 3인 역할 분담 · 시간표 · 발표 시나리오가 들어 있습니다.
>
> 👉 **[docs/DEVELOPMENT_GUIDE.md §11 Git 규칙](docs/DEVELOPMENT_GUIDE.md#11-git-사용-규칙-팀-공통)** 은 당일 열어두고 작업하세요.

---

## 1. 왜 필요한가

| | A 공고 | B 공고 |
|---|---|---|
| 표시 시급 | **12,000원** | 10,500원 |
| 하루 근무 | 5시간 | 5시간 |
| 편도 이동 | 35분 | 10분 |
| 왕복 교통비 | 2,800원 | 1,600원 |
| **실질시급** | **9,276원** | **9,544원** |
| 손실률 | −22.7% | −9.1% |

시급이 1,500원 더 높은 A가 실제로는 더 나쁜 선택입니다.
이 서비스는 이 역전 현상을 **공고 목록 단계에서** 바로 보여줍니다.

---

## 2. 핵심 계산식

```
                시급 × 일 근무시간 − 일 왕복 교통비
실질시급 = ─────────────────────────────────────────
                일 근무시간 + 일 왕복 이동시간
```

- **일 왕복 교통비** = (편도 요금 × 2) − 사업장 교통비 지원액
- **일 왕복 이동시간** = 편도 소요시간 × 2 (분 → 시간 환산)
- 교통비 지원이 실비 전액이면 분자의 교통비는 0
- 주휴수당 옵션을 켜면 `주휴수당 = (주 소정근로시간 ÷ 40) × 8 × 시급` 을 주급에 더한 뒤 일 단위로 환산

> 계산 로직 전체 명세와 엣지 케이스는 [개발 가이드 §6](docs/DEVELOPMENT_GUIDE.md#6-실질시급-계산-모듈)을 참고하세요.

---

## 3. 주요 기능

### 구직자
- 키워드 + 출발지 기반 알바 검색 (사람인 공고 + 사장님 공고 통합)
- **실질시급 순 정렬** — 서비스의 핵심 차별점
- 공고 상세에서 계산 과정 분해 표시 (시급 / 교통비 / 이동시간 각각의 기여도)
- 근무시간 슬라이더로 "하루 N시간 일하면?" 실시간 재계산
- 공고 2~3개 나란히 비교
- 찜하기 · 계산 이력 저장
- 최저임금 미달 공고 경고 배지

### 사장님 (고용주)
- 모집공고 직접 등록 (시급·근무시간·근무요일·교통비 지원 여부를 **구조화 입력**)
- 등록한 공고의 실질시급이 얼마로 보이는지 미리보기
- 지원자 문의 관리, 공고 노출 통계

### 시스템
- 사람인 API 주기적 동기화 (배치)
- 경로/지오코딩 결과 이중 캐싱 (Redis + PostgreSQL) — 외부 API 쿼터 절약

---

## 4. 기술 스택

| 레이어 | 선택 | 이유 |
|---|---|---|
| 프론트엔드 | Next.js 14 (App Router), TypeScript, TailwindCSS | SSR로 검색 결과 SEO 확보 |
| 상태/데이터 | TanStack Query, Zustand | 서버 상태 캐싱 + 계산 파라미터 로컬 상태 |
| 백엔드 | Next.js Route Handlers | 초기 단일 배포, 트래픽 증가 시 NestJS로 분리 |
| DB | PostgreSQL 15 + PostGIS | 좌표 반경 검색 (`ST_DWithin`) |
| ORM | Prisma | 타입 안전 + 마이그레이션 |
| 캐시/큐 | Redis (Upstash) | 경로 캐시, 레이트리밋 |
| 인증 | Auth.js (NextAuth) | 카카오 로그인 + 이메일 |
| 배치 | Vercel Cron → `/api/cron/sync-saramin` | 별도 인프라 불필요 |
| 테스트 | Vitest, Playwright | 계산 로직 유닛테스트 필수 |

### 외부 API

| 용도 | 서비스 | 비고 |
|---|---|---|
| 채용공고 | 사람인 오픈 API (`oapi.saramin.co.kr/job-search`) | 일일 호출 한도 있음 → 배치 수집 |
| 주소 → 좌표 | 카카오 로컬 API | 키워드/주소 검색 모두 지원 |
| 대중교통 경로 | ODsay LAB `searchPubTransPathT` | **소요시간 + 요금**을 한 번에 반환 |
| 지도 렌더링 | 카카오맵 JS SDK | 경로 시각화 |

---

## 5. 빠른 시작

```bash
git clone https://github.com/ehrud8657/realwage.git
cd realwage
pnpm install
cp .env.example .env.local   # 아래 표 참고해 값 채우기
docker compose up -d         # postgres + redis
pnpm prisma migrate dev
pnpm db:seed                 # 최저임금 테이블 + 샘플 공고
pnpm dev                     # http://localhost:3000
```

### 환경 변수

```bash
DATABASE_URL="postgresql://realwage:realwage@localhost:5432/realwage"
REDIS_URL="redis://localhost:6379"

SARAMIN_ACCESS_KEY=""        # https://oapi.saramin.co.kr 발급
ODSAY_API_KEY=""             # https://lab.odsay.com 발급
KAKAO_REST_API_KEY=""        # https://developers.kakao.com
NEXT_PUBLIC_KAKAO_JS_KEY=""

AUTH_SECRET=""               # openssl rand -base64 32
CRON_SECRET=""               # 배치 엔드포인트 보호용
```

---

## 6. 프로젝트 구조

```
realwage/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                    # S-01 홈/검색
│  │  ├─ search/page.tsx             # S-02 검색 결과
│  │  ├─ jobs/[id]/page.tsx          # S-03 공고 상세
│  │  ├─ calculator/page.tsx         # S-04 단독 계산기
│  │  ├─ compare/page.tsx            # S-09 공고 비교
│  │  ├─ me/page.tsx                 # S-08 마이페이지
│  │  ├─ employer/                   # S-06, S-07 사장님 영역
│  │  └─ api/
│  │     ├─ jobs/route.ts            # 검색 + 실질시급 계산
│  │     ├─ jobs/[id]/route.ts
│  │     ├─ calc/route.ts            # 단건 계산
│  │     ├─ geocode/route.ts
│  │     ├─ transit/route.ts
│  │     ├─ employer/jobs/route.ts
│  │     └─ cron/sync-saramin/route.ts
│  ├─ lib/
│  │  ├─ calc/realWage.ts            # ★ 핵심 순수 함수
│  │  ├─ saramin/{client,parser}.ts  # 공고 수집 + 시급 텍스트 파싱
│  │  ├─ transit/odsay.ts
│  │  ├─ geo/kakao.ts
│  │  ├─ cache/                      # Redis + DB 이중 캐시
│  │  └─ db/prisma.ts
│  ├─ components/
│  └─ types/
├─ prisma/schema.prisma
├─ docs/
│  ├─ WIREFRAME.md
│  ├─ DATABASE.md
│  ├─ DEVELOPMENT_GUIDE.md
│  └─ wireframe.html
└─ tests/
```

---

## 7. 문서

| 문서 | 내용 |
|---|---|
| ⭐ [docs/TEAM.md](docs/TEAM.md) | **10시간 해커톤 실행 계획** — 범위 축소, 3인 역할 분담, 시간표, 발표 시나리오 |
| [docs/WIREFRAME.md](docs/WIREFRAME.md) | 화면 9종 와이어프레임, IA, 사용자 플로우, 컴포넌트 목록 |
| [docs/wireframe.html](docs/wireframe.html) | 브라우저에서 보는 시각 와이어프레임 |
| [docs/DATABASE.md](docs/DATABASE.md) | ERD, 테이블 14종 정의, DDL 전문, 인덱스 전략 |
| [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) | 아키텍처, 외부 API 연동, 계산 모듈 명세, API 스펙, 테스트, 배포 |

---

## 8. 로드맵

### 10시간 해커톤 범위 (실제 만들 것)

계산 모듈 · 홈(S-01) · 검색 결과(S-02) · 공고 상세(S-03) · 외부 API 3종 연동.
**DB, 로그인, 사장님 등록 폼, 찜/이력/비교는 전부 제외합니다.** 상세는 [docs/TEAM.md](docs/TEAM.md) §1.

### 이후 완성형 로드맵

- [x] 기획 · 설계 문서
- [ ] **Phase 1** — DB 스키마 + 실질시급 계산 모듈 + 유닛테스트
- [ ] **Phase 2** — 사람인 동기화 배치 + 공고 검색 API
- [ ] **Phase 3** — ODsay 경로 연동 + 캐싱 + 검색 결과 UI
- [ ] **Phase 4** — 사장님 공고 등록/관리
- [ ] **Phase 5** — 인증, 찜, 계산 이력, 비교 화면
- [ ] Phase 6 — 알림(조건 맞는 공고 등록 시), 지역 통계 리포트

---

## 9. 알려진 한계

1. **사람인 API는 근무시간을 제공하지 않습니다.**
   → 공고 제목/본문에서 정규식으로 추정하고, 실패하면 사용자가 슬라이더로 입력합니다.
   사장님이 직접 등록한 공고만 근무시간이 정확합니다. 이 차이는 UI에 `추정치` 배지로 표시합니다.
2. **시급이 텍스트로 옵니다** (`"시급 10,030원"`, `"회사내규에 따름"` 등).
   파싱 실패 시 `pay_type = NEGOTIABLE`로 저장하고 실질시급 계산에서 제외합니다.
3. ODsay 무료 플랜은 일일 호출 한도가 있습니다. 좌표를 격자로 반올림해 캐시 적중률을 올립니다.
4. 실시간 교통상황·환승 도보시간 편차는 반영되지 않습니다. 표시값은 평시 기준 추정치입니다.

---

## 10. 주의사항

- 사람인 오픈 API **이용약관을 준수**합니다. 크롤링/스크래핑은 하지 않으며, 공고 원문은 저장하되 화면에는 요약 + 원본 링크를 제공합니다.
- 최저임금은 `minimum_wages` 테이블로 연도별 관리합니다. 하드코딩하지 마세요.
- 실질시급은 **참고용 지표**이며 근로계약의 근거가 아닙니다. 서비스 하단에 고지합니다.

---

## 라이선스

MIT
