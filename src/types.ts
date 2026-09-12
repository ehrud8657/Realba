/**
 * 공용 타입 — 팀 전원이 이 파일을 기준으로 작업합니다.
 *
 * 소유자: A (백엔드)
 * B, C는 읽기만 하세요. 바꿔야 하면 A에게 말로 요청합니다.
 * (→ docs/TEAM.md §3 파일 소유권)
 */

export type JobSource = 'SARAMIN' | 'OWNER';
export type TransportMode = 'TRANSIT' | 'TAXI' | 'CAR';

/** 좌표. 카카오 API는 x=lng, y=lat 이니 주의 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 공고 한 건 */
export interface Job {
  id: string;
  source: JobSource;
  title: string;
  companyName: string;
  address: string;
  location: LatLng;

  /** 시급(원). 시급제가 아니면 환산값 */
  hourlyWage: number;
  /** 하루 근무시간 */
  dailyWorkHours: number;
  /** true면 화면에 '추정' 배지를 답니다. 사람인 공고는 근무시간을 주지 않아 대부분 true */
  hoursIsEstimated: boolean;

  /** 원본 공고 링크. 사장님 공고는 null */
  url: string | null;

  /** 하루 교통비 지원액(원). 사장님 공고에만 있습니다 */
  transportSubsidyPerDay?: number;
}

/** 출발지 → 근무지 편도 경로 */
export interface Route {
  /** 편도 이동시간(분) */
  oneWayMinutes: number;
  /** 편도 요금(원) */
  oneWayFare: number;
  mode?: TransportMode;
}

/** 실질시급 계산 결과 */
export interface Calc {
  /** 공고에 표시된 시급 */
  nominalHourlyWage: number;
  /** 실질시급 ★ 이 서비스의 전부 */
  realHourlyWage: number;
  /** 계산에 쓴 하루 근무시간 */
  dailyWorkHours: number;
  /** 하루 실수령액 (급여 − 왕복 교통비) */
  dailyNetPay: number;
  /** 하루 왕복 교통비 */
  dailyCommuteCost: number;
  /** 하루 왕복 이동시간(시간) */
  dailyCommuteHours: number;
  /** 하루 구속시간 (근무 + 이동) */
  totalOccupiedHours: number;
  /** 손실률. 0.227 = 22.7% 손해 */
  lossRate: number;
}

/** API가 돌려주는 한 건 */
export interface JobResult {
  job: Job;
  /** 경로를 못 구하면 null */
  route: Route | null;
  /** route가 null이면 calc도 null */
  calc: Calc | null;
}

export type SortKey = 'REAL_WAGE' | 'NOMINAL_WAGE' | 'COMMUTE';

/** GET /api/jobs 응답 */
export interface JobsResponse {
  /** 'mock' = 목데이터, 'live' = 외부 API 연동됨. 화면 우측 상단에 표시해 디버깅에 씁니다 */
  mode: 'mock' | 'live';
  origin: { label: string; location: LatLng } | null;
  total: number;
  items: JobResult[];
}
