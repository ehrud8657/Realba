# DB 구조 — 리알바 (RealBa)

PostgreSQL 15 + PostGIS 3.4 기준.

---

## 1. 설계 원칙

1. **공고는 한 테이블에 통합한다.** 사람인 공고와 사장님 공고는 `job_posts.source`로만 구분합니다. 검색·정렬·계산 로직을 이원화하지 않기 위해서입니다.
2. **급여와 근무시간은 정규화해서 저장한다.** 사람인이 주는 `"시급 10,030원"` 같은 텍스트는 `pay_raw_text`에 원문을 남기고, 파싱 결과를 `pay_type` + `pay_amount`에 넣습니다. 파싱 실패는 `NEGOTIABLE`로 표시해 계산에서 제외합니다.
3. **외부 API 응답은 반드시 캐싱한다.** 지오코딩·경로 조회는 쿼터가 제한되고 결과가 거의 변하지 않습니다. Redis(단기) + PostgreSQL(영구) 이중 캐시를 둡니다.
4. **계산 결과는 저장하지 않고 매번 계산한다.** 단, 사용자가 명시적으로 저장한 이력(`wage_calculations`)만 남깁니다. 근무시간·교통비 지원 같은 입력이 바뀌면 결과가 달라지므로 캐싱 대상이 아닙니다.
5. **최저임금은 테이블로 관리한다.** 매년 바뀌는 값을 코드에 넣지 않습니다.
6. 모든 시각은 `timestamptz`, 통화는 `integer`(원 단위, 소수점 없음), 좌표는 `geography(Point, 4326)`.

---

## 2. ERD

```mermaid
erDiagram
    users ||--o| user_profiles : has
    users ||--o{ saved_places : owns
    users ||--o{ favorites : makes
    users ||--o{ wage_calculations : records
    users ||--o{ companies : manages

    companies ||--o{ job_posts : posts
    job_posts ||--o{ job_post_schedules : has
    job_posts ||--o{ job_post_tags : tagged
    job_tags  ||--o{ job_post_tags : used_in
    job_posts ||--o{ favorites : favorited
    job_posts ||--o{ wage_calculations : calculated_for
    job_categories ||--o{ job_posts : categorizes

    saramin_sync_logs }o--|| job_categories : scanned

    users {
        uuid id PK
        citext email UK
        text password_hash
        user_role role
        text nickname
        timestamptz created_at
    }
    user_profiles {
        uuid user_id PK_FK
        uuid default_place_id FK
        numeric default_daily_hours
        boolean include_weekly_holiday_pay
    }
    saved_places {
        uuid id PK
        uuid user_id FK
        text label
        text address
        geography location
        boolean is_default
    }
    companies {
        uuid id PK
        uuid owner_user_id FK
        text name
        text business_number
        boolean is_verified
    }
    job_posts {
        uuid id PK
        job_source source
        text external_id UK
        uuid company_id FK
        text title
        pay_type pay_type
        integer pay_amount
        text pay_raw_text
        numeric daily_work_hours
        boolean hours_is_estimated
        subsidy_type transport_subsidy_type
        integer transport_subsidy_amount
        geography location
        job_status status
        timestamptz expires_at
    }
    job_post_schedules {
        uuid id PK
        uuid job_post_id FK
        smallint day_of_week
        time start_time
        time end_time
        smallint break_minutes
    }
    geocode_cache {
        text query_hash PK
        geography location
        timestamptz expires_at
    }
    transit_route_cache {
        text route_key PK
        smallint total_time_min
        integer fare_won
        jsonb path_json
        timestamptz expires_at
    }
    minimum_wages {
        smallint year PK
        integer hourly_amount
    }
    wage_calculations {
        uuid id PK
        uuid user_id FK
        uuid job_post_id FK
        integer real_hourly_wage
        jsonb inputs
    }
```

---

## 3. ENUM 타입

| 타입 | 값 | 설명 |
|---|---|---|
| `user_role` | `SEEKER`, `EMPLOYER`, `ADMIN` | 구직자 / 사장님 / 운영자 |
| `job_source` | `SARAMIN`, `OWNER` | 공고 출처 |
| `pay_type` | `HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, `NEGOTIABLE` | 급여 형태 |
| `subsidy_type` | `NONE`, `DAILY_FIXED`, `MONTHLY_FIXED`, `ACTUAL_FULL` | 교통비 지원 방식 |
| `job_status` | `DRAFT`, `ACTIVE`, `CLOSED`, `EXPIRED`, `HIDDEN` | 공고 상태 |
| `transit_mode` | `TRANSIT`, `WALK`, `CAR`, `BIKE` | 이동 수단 |
| `sync_status` | `SUCCESS`, `PARTIAL`, `FAILED` | 배치 결과 |

---

## 4. 테이블 정의

### 4.1 `users` — 계정

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `email` | citext | UNIQUE, NOT NULL | 대소문자 무시 |
| `password_hash` | text | NULL 허용 | 소셜 로그인 전용 계정은 NULL |
| `role` | user_role | NOT NULL, 기본 `SEEKER` | |
| `nickname` | text | NOT NULL | |
| `phone` | text | | 사장님 문의용 |
| `provider` | text | | `kakao`, `credentials` 등 |
| `provider_account_id` | text | | |
| `last_login_at` | timestamptz | | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |
| `deleted_at` | timestamptz | | 소프트 삭제 |

### 4.2 `user_profiles` — 계산 기본값

사용자가 매번 같은 값을 다시 입력하지 않도록 개인 기본값을 둡니다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | uuid | PK, FK → users |
| `default_place_id` | uuid | FK → saved_places. 검색 시 기본 출발지 |
| `default_daily_hours` | numeric(4,2) | 기본 5.00 |
| `include_weekly_holiday_pay` | boolean | 주휴수당 포함 여부 기본값 |
| `preferred_transit_mode` | transit_mode | 기본 `TRANSIT` |
| `max_commute_minutes` | smallint | 검색 필터 기본값 (편도) |

### 4.3 `saved_places` — 즐겨찾는 출발지

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users, ON DELETE CASCADE |
| `label` | text | `집`, `학교` |
| `address` | text | 표시용 주소 |
| `road_address` | text | |
| `location` | geography(Point,4326) | NOT NULL |
| `is_default` | boolean | 사용자당 1건만 true (부분 유니크 인덱스) |
| `created_at` | timestamptz | |

### 4.4 `companies` — 사업장

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `owner_user_id` | uuid | FK → users. 사람인 공고의 회사는 NULL |
| `source` | job_source | 사람인 회사 정보도 여기에 저장 |
| `name` | text | NOT NULL |
| `business_number` | text | 사업자등록번호, 사장님 회원만 |
| `is_verified` | boolean | 사업자 인증 여부 |
| `logo_url` | text | |
| `intro` | text | 사업장 소개 |
| `created_at` | timestamptz | |

### 4.5 `job_posts` — 공고 (핵심 테이블)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `source` | job_source | `SARAMIN` / `OWNER` |
| `external_id` | text | 사람인 공고 ID. `(source, external_id)` UNIQUE |
| `company_id` | uuid | FK → companies |
| `category_id` | int | FK → job_categories |
| `title` | text | NOT NULL |
| `description` | text | 사장님 공고 본문 |
| `employment_type` | text | 아르바이트 / 계약직 등 |
| `headcount` | smallint | 모집 인원 |
| **급여** | | |
| `pay_type` | pay_type | |
| `pay_amount` | integer | 원 단위. `NEGOTIABLE`이면 NULL |
| `pay_raw_text` | text | 사람인 원문 (`"시급 10,030원"`) |
| `pays_weekly_holiday` | boolean | 주휴수당 지급 여부 |
| **근무시간** | | |
| `daily_work_hours` | numeric(4,2) | 하루 근무시간 |
| `weekly_work_hours` | numeric(5,2) | 주 소정근로시간, 주휴수당 계산용 |
| `hours_is_estimated` | boolean | true면 UI에 `추정치` 배지 |
| `hours_estimate_source` | text | `TITLE_REGEX`, `DEFAULT`, `OWNER_INPUT` |
| **교통비** | | |
| `transport_subsidy_type` | subsidy_type | 기본 `NONE` |
| `transport_subsidy_amount` | integer | 일/월 정액일 때 금액 |
| `provides_meal` | boolean | |
| **위치** | | |
| `address` | text | |
| `address_detail` | text | |
| `region_code` | text | 행정구역 코드, 지역 필터용 |
| `location` | geography(Point,4326) | NOT NULL. 없으면 계산 불가 |
| **상태** | | |
| `status` | job_status | |
| `url` | text | 원본 공고 링크 |
| `view_count` | integer | 기본 0 |
| `posted_at` / `expires_at` | timestamptz | |
| `raw_json` | jsonb | 사람인 응답 원문 보관 (재파싱용) |
| `created_at` / `updated_at` | timestamptz | |

> `daily_work_hours`가 NULL이면 실질시급을 계산할 수 없습니다. 이 경우 검색 API는 사용자가 지정한 기본 근무시간(`user_profiles.default_daily_hours` 또는 요청 파라미터)을 대입하고 `hours_is_estimated = true`로 응답합니다.

### 4.6 `job_post_schedules` — 요일별 근무시간

요일마다 시간이 다른 공고를 위한 1:N 테이블. 단일 스케줄이면 `job_posts`의 값만 써도 됩니다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `job_post_id` | uuid | FK, ON DELETE CASCADE |
| `day_of_week` | smallint | 0=일 … 6=토. CHECK 0~6 |
| `start_time` | time | |
| `end_time` | time | 자정을 넘기면 `end_time < start_time` 허용 |
| `break_minutes` | smallint | 휴게시간 |
| `crosses_midnight` | boolean | 야간근무 플래그 |

`UNIQUE (job_post_id, day_of_week)`

### 4.7 `job_categories` / `job_tags` / `job_post_tags`

| 테이블 | 컬럼 | 설명 |
|---|---|---|
| `job_categories` | `id`, `name`, `saramin_job_cd`, `parent_id` | 사람인 직종 코드 매핑 |
| `job_tags` | `id`, `name` | `주말만`, `단기`, `미성년가능` |
| `job_post_tags` | `job_post_id`, `tag_id` | 복합 PK |

### 4.8 `geocode_cache` — 주소 → 좌표 캐시

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `query_hash` | text | PK. `sha256(normalize(query))` |
| `query` | text | 원본 질의 |
| `address` | text | 정제된 주소 |
| `location` | geography(Point,4326) | |
| `provider` | text | `kakao` |
| `hit_count` | integer | 인기 질의 파악용 |
| `created_at`, `expires_at` | timestamptz | TTL 90일 |

### 4.9 `transit_route_cache` — 경로 캐시 ★

외부 API 호출을 줄이는 가장 중요한 테이블입니다.
좌표를 소수점 4자리(약 11m)로 반올림한 격자 키를 써서 적중률을 높입니다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `route_key` | text | PK. `{mode}:{oLat}_{oLng}:{dLat}_{dLng}` |
| `mode` | transit_mode | |
| `origin` / `destination` | geography(Point,4326) | |
| `total_time_min` | smallint | 편도 소요시간 |
| `fare_won` | integer | 편도 요금 |
| `transfer_count` | smallint | 환승 횟수 |
| `walk_distance_m` | integer | 총 도보 거리 |
| `path_json` | jsonb | 경로 상세 (지도 렌더링용) |
| `provider` | text | `odsay` |
| `created_at`, `expires_at` | timestamptz | TTL 30일 |

**운영 정책**
- 조회 순서: Redis(TTL 7일) → `transit_route_cache` → 외부 API
- 외부 API 실패 시 만료된 캐시라도 반환하고 `stale: true` 플래그를 응답에 포함
- 매일 새벽 `expires_at < now() - interval '90 days'` 행 삭제

### 4.10 `minimum_wages` — 연도별 최저임금

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `year` | smallint | PK |
| `hourly_amount` | integer | 시간당 최저임금(원) |
| `effective_from` | date | 적용 시작일 |
| `source_url` | text | 고시 근거 링크 |

### 4.11 `wage_calculations` — 계산 이력

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK. 비로그인 저장은 NULL |
| `job_post_id` | uuid | FK. 단독 계산기는 NULL |
| `origin_place_id` | uuid | FK → saved_places |
| `origin_location` | geography(Point,4326) | 즐겨찾기가 삭제돼도 남도록 좌표 복사 |
| `nominal_hourly_wage` | integer | |
| `real_hourly_wage` | integer | |
| `daily_net_pay` | integer | |
| `loss_rate` | numeric(5,4) | 0.2270 = 22.70% |
| `inputs` | jsonb | 계산에 쓴 전체 입력 스냅샷 |
| `created_at` | timestamptz | |

> `inputs`에 입력 전체를 남겨야 나중에 계산식이 바뀌어도 과거 결과를 재현할 수 있습니다.

### 4.12 `favorites` — 찜

`(user_id, job_post_id)` 복합 PK, `created_at`.

### 4.13 `saramin_sync_logs` — 배치 로그

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigserial | PK |
| `started_at` / `finished_at` | timestamptz | |
| `status` | sync_status | |
| `keyword` | text | 수집 키워드 |
| `job_cd` | text | 직종 코드 |
| `fetched_count` | integer | API가 준 건수 |
| `created_count` / `updated_count` / `skipped_count` | integer | |
| `parse_fail_count` | integer | 급여 파싱 실패 건수 — 파서 개선 지표 |
| `geocode_fail_count` | integer | |
| `error_message` | text | |

### 4.14 `job_post_views` (선택) — 통계

사장님 대시보드 조회수용. 일 단위 집계 테이블로 `(job_post_id, date, view_count, favorite_count)`를 두고, 원본 이벤트는 보관하지 않습니다.

---

## 5. DDL

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- 제목 부분검색
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()

CREATE TYPE user_role    AS ENUM ('SEEKER','EMPLOYER','ADMIN');
CREATE TYPE job_source   AS ENUM ('SARAMIN','OWNER');
CREATE TYPE pay_type     AS ENUM ('HOURLY','DAILY','WEEKLY','MONTHLY','YEARLY','NEGOTIABLE');
CREATE TYPE subsidy_type AS ENUM ('NONE','DAILY_FIXED','MONTHLY_FIXED','ACTUAL_FULL');
CREATE TYPE job_status   AS ENUM ('DRAFT','ACTIVE','CLOSED','EXPIRED','HIDDEN');
CREATE TYPE transit_mode AS ENUM ('TRANSIT','WALK','CAR','BIKE');
CREATE TYPE sync_status  AS ENUM ('SUCCESS','PARTIAL','FAILED');

-- 계정 ---------------------------------------------------------------
CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               citext UNIQUE NOT NULL,
  password_hash       text,
  role                user_role NOT NULL DEFAULT 'SEEKER',
  nickname            text NOT NULL,
  phone               text,
  provider            text,
  provider_account_id text,
  last_login_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TABLE saved_places (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      text NOT NULL,
  address    text NOT NULL,
  road_address text,
  location   geography(Point,4326) NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_saved_places_default
  ON saved_places(user_id) WHERE is_default;

CREATE TABLE user_profiles (
  user_id                   uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_place_id          uuid REFERENCES saved_places(id) ON DELETE SET NULL,
  default_daily_hours       numeric(4,2) NOT NULL DEFAULT 5.00,
  include_weekly_holiday_pay boolean NOT NULL DEFAULT false,
  preferred_transit_mode    transit_mode NOT NULL DEFAULT 'TRANSIT',
  max_commute_minutes       smallint DEFAULT 60,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- 사업장 / 공고 -------------------------------------------------------
CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  source          job_source NOT NULL DEFAULT 'OWNER',
  name            text NOT NULL,
  business_number text,
  is_verified     boolean NOT NULL DEFAULT false,
  logo_url        text,
  intro           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE job_categories (
  id             serial PRIMARY KEY,
  name           text NOT NULL,
  saramin_job_cd text,
  parent_id      int REFERENCES job_categories(id)
);

CREATE TABLE job_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        job_source NOT NULL,
  external_id   text,
  company_id    uuid REFERENCES companies(id) ON DELETE SET NULL,
  category_id   int  REFERENCES job_categories(id),

  title            text NOT NULL,
  description      text,
  employment_type  text,
  headcount        smallint,

  pay_type             pay_type NOT NULL DEFAULT 'NEGOTIABLE',
  pay_amount           integer,
  pay_raw_text         text,
  pays_weekly_holiday  boolean NOT NULL DEFAULT false,

  daily_work_hours     numeric(4,2),
  weekly_work_hours    numeric(5,2),
  hours_is_estimated   boolean NOT NULL DEFAULT true,
  hours_estimate_source text,

  transport_subsidy_type   subsidy_type NOT NULL DEFAULT 'NONE',
  transport_subsidy_amount integer,
  provides_meal            boolean NOT NULL DEFAULT false,

  address        text,
  address_detail text,
  region_code    text,
  location       geography(Point,4326) NOT NULL,

  status      job_status NOT NULL DEFAULT 'ACTIVE',
  url         text,
  view_count  integer NOT NULL DEFAULT 0,
  posted_at   timestamptz,
  expires_at  timestamptz,
  raw_json    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_job_external UNIQUE (source, external_id),
  CONSTRAINT ck_pay_amount CHECK (
    (pay_type = 'NEGOTIABLE' AND pay_amount IS NULL)
    OR (pay_type <> 'NEGOTIABLE' AND pay_amount > 0)
  ),
  CONSTRAINT ck_subsidy CHECK (
    (transport_subsidy_type IN ('NONE','ACTUAL_FULL') AND transport_subsidy_amount IS NULL)
    OR (transport_subsidy_type IN ('DAILY_FIXED','MONTHLY_FIXED') AND transport_subsidy_amount >= 0)
  ),
  CONSTRAINT ck_hours CHECK (daily_work_hours IS NULL OR daily_work_hours BETWEEN 0.5 AND 24)
);

CREATE TABLE job_post_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id      uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  day_of_week      smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time       time NOT NULL,
  end_time         time NOT NULL,
  break_minutes    smallint NOT NULL DEFAULT 0,
  crosses_midnight boolean NOT NULL DEFAULT false,
  UNIQUE (job_post_id, day_of_week)
);

CREATE TABLE job_tags (
  id   serial PRIMARY KEY,
  name text UNIQUE NOT NULL
);
CREATE TABLE job_post_tags (
  job_post_id uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  tag_id      int  NOT NULL REFERENCES job_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (job_post_id, tag_id)
);

-- 캐시 ---------------------------------------------------------------
CREATE TABLE geocode_cache (
  query_hash text PRIMARY KEY,
  query      text NOT NULL,
  address    text,
  location   geography(Point,4326) NOT NULL,
  provider   text NOT NULL DEFAULT 'kakao',
  hit_count  integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days'
);

CREATE TABLE transit_route_cache (
  route_key       text PRIMARY KEY,
  mode            transit_mode NOT NULL,
  origin          geography(Point,4326) NOT NULL,
  destination     geography(Point,4326) NOT NULL,
  total_time_min  smallint NOT NULL,
  fare_won        integer  NOT NULL,
  transfer_count  smallint NOT NULL DEFAULT 0,
  walk_distance_m integer,
  path_json       jsonb,
  provider        text NOT NULL DEFAULT 'odsay',
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

-- 기준값 / 이력 -------------------------------------------------------
CREATE TABLE minimum_wages (
  year           smallint PRIMARY KEY,
  hourly_amount  integer NOT NULL,
  effective_from date NOT NULL,
  source_url     text
);

CREATE TABLE wage_calculations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE CASCADE,
  job_post_id         uuid REFERENCES job_posts(id) ON DELETE SET NULL,
  origin_place_id     uuid REFERENCES saved_places(id) ON DELETE SET NULL,
  origin_location     geography(Point,4326) NOT NULL,
  nominal_hourly_wage integer NOT NULL,
  real_hourly_wage    integer NOT NULL,
  daily_net_pay       integer NOT NULL,
  loss_rate           numeric(5,4) NOT NULL,
  inputs              jsonb NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE favorites (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_post_id uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_post_id)
);

CREATE TABLE saramin_sync_logs (
  id                bigserial PRIMARY KEY,
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  status            sync_status NOT NULL DEFAULT 'SUCCESS',
  keyword           text,
  job_cd            text,
  fetched_count     integer NOT NULL DEFAULT 0,
  created_count     integer NOT NULL DEFAULT 0,
  updated_count     integer NOT NULL DEFAULT 0,
  skipped_count     integer NOT NULL DEFAULT 0,
  parse_fail_count  integer NOT NULL DEFAULT 0,
  geocode_fail_count integer NOT NULL DEFAULT 0,
  error_message     text
);
```

---

## 6. 인덱스 전략

```sql
-- 1) 반경 검색: 가장 자주 쓰이는 쿼리
CREATE INDEX idx_job_posts_location ON job_posts USING GIST (location);

-- 2) 활성 공고만 조회하는 부분 인덱스
CREATE INDEX idx_job_posts_active
  ON job_posts (status, expires_at DESC)
  WHERE status = 'ACTIVE';

-- 3) 시급 정렬/필터 (시급제 공고만)
CREATE INDEX idx_job_posts_hourly_pay
  ON job_posts (pay_amount DESC)
  WHERE pay_type = 'HOURLY' AND status = 'ACTIVE';

-- 4) 제목 부분검색
CREATE INDEX idx_job_posts_title_trgm
  ON job_posts USING GIN (title gin_trgm_ops);

-- 5) 배치 업서트 대상 조회
CREATE INDEX idx_job_posts_source_updated ON job_posts (source, updated_at DESC);

-- 6) 사장님 대시보드
CREATE INDEX idx_job_posts_company ON job_posts (company_id, status);

-- 7) 캐시 만료 정리
CREATE INDEX idx_transit_cache_expires ON transit_route_cache (expires_at);
CREATE INDEX idx_geocode_cache_expires ON geocode_cache (expires_at);

-- 8) 마이페이지
CREATE INDEX idx_calculations_user ON wage_calculations (user_id, created_at DESC);
```

**대표 쿼리 — 반경 5km 활성 시급제 공고**

```sql
SELECT j.id, j.title, j.pay_amount, j.daily_work_hours,
       ST_Distance(j.location, $1::geography) AS distance_m
FROM job_posts j
WHERE j.status = 'ACTIVE'
  AND j.pay_type = 'HOURLY'
  AND (j.expires_at IS NULL OR j.expires_at > now())
  AND ST_DWithin(j.location, $1::geography, 5000)
ORDER BY distance_m
LIMIT 50;
```

> 실질시급 정렬은 SQL에서 하지 않습니다. 경로 계산이 필요하므로,
> ① 반경/키워드로 후보 50~100건을 DB에서 뽑고 → ② 애플리케이션에서 캐시 기반으로 경로를 병렬 조회한 뒤 → ③ 계산 결과로 정렬합니다.

---

## 7. 캐시 키 규칙

```ts
// 격자 반올림: 소수점 4자리 ≈ 11m
const grid = (n: number) => n.toFixed(4);

export const routeKey = (
  mode: TransitMode, o: LatLng, d: LatLng
) => `${mode}:${grid(o.lat)}_${grid(o.lng)}:${grid(d.lat)}_${grid(d.lng)}`;

export const geocodeHash = (q: string) =>
  sha256(q.trim().replace(/\s+/g, ' ').toLowerCase());
```

| 캐시 | 계층 | TTL | 무효화 |
|---|---|---|---|
| 지오코딩 | Redis → DB | 7일 / 90일 | 수동 |
| 경로 | Redis → DB | 7일 / 30일 | 대중교통 요금 인상 시 전체 삭제 |
| 검색 결과 | Redis | 5분 | 공고 업서트 시 지역 키 삭제 |
| 최저임금 | 앱 메모리 | 24시간 | 배포 시 |

---

## 8. 시드 데이터

```sql
INSERT INTO minimum_wages (year, hourly_amount, effective_from, source_url) VALUES
  (2024, 9860,  '2024-01-01', 'https://www.minimumwage.go.kr'),
  (2025, 10030, '2025-01-01', 'https://www.minimumwage.go.kr'),
  (2026, 10320, '2026-01-01', 'https://www.minimumwage.go.kr');
```

> 최저임금 값은 배포 전 고용노동부 고시로 반드시 재확인하고 넣으세요. 코드가 아닌 이 테이블만 고치면 되도록 설계되어 있습니다.

---

## 9. 마이그레이션 / 운영

- Prisma Migrate로 관리합니다. PostGIS 타입은 Prisma가 직접 지원하지 않으므로
  `location Unsupported("geography(Point,4326)")`로 선언하고, 반경 검색은 `$queryRaw`로 작성합니다.
- 확장 설치(`postgis`, `citext`, `pg_trgm`, `pgcrypto`)는 첫 마이그레이션 파일 맨 위에 수동으로 추가합니다.
- `job_posts`가 수백만 건을 넘어가면 `posted_at` 기준 월 단위 파티셔닝을 검토합니다. 초기에는 불필요합니다.
- 야간 정리 작업(cron):
  1. `UPDATE job_posts SET status='EXPIRED' WHERE status='ACTIVE' AND expires_at < now()`
  2. 만료 후 90일 지난 캐시 행 삭제
  3. `saramin_sync_logs` 90일 이전 로그 삭제

---

## 10. Prisma 스키마 (발췌)

```prisma
model JobPost {
  id          String   @id @default(uuid()) @db.Uuid
  source      JobSource
  externalId  String?  @map("external_id")
  companyId   String?  @map("company_id") @db.Uuid
  title       String
  payType     PayType  @default(NEGOTIABLE) @map("pay_type")
  payAmount   Int?     @map("pay_amount")
  payRawText  String?  @map("pay_raw_text")

  dailyWorkHours    Decimal? @map("daily_work_hours") @db.Decimal(4, 2)
  weeklyWorkHours   Decimal? @map("weekly_work_hours") @db.Decimal(5, 2)
  hoursIsEstimated  Boolean  @default(true) @map("hours_is_estimated")

  transportSubsidyType   SubsidyType @default(NONE) @map("transport_subsidy_type")
  transportSubsidyAmount Int?        @map("transport_subsidy_amount")

  address  String?
  location Unsupported("geography(Point, 4326)")

  status    JobStatus @default(ACTIVE)
  expiresAt DateTime? @map("expires_at")
  rawJson   Json?     @map("raw_json")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  company    Company?           @relation(fields: [companyId], references: [id])
  schedules  JobPostSchedule[]
  favorites  Favorite[]

  @@unique([source, externalId])
  @@index([status, expiresAt])
  @@map("job_posts")
}
```
