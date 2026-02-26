// ⚠️ 매년 12월에 다음 해 값으로 업데이트 필요!
// 최저임금은 매년 8월에 발표되고 다음 해 1월 1일부터 적용

/**
 * 법적 기준값 상수
 * 학온(HAGON) 계약서 유효성 검증 로직에서 사용하는 모든 법적 기준값을 정의합니다.
 */
export const LEGAL_STANDARDS = {
  // === 최저임금 (2026년) ===
  YEAR: 2026,
  MIN_HOURLY_WAGE: 10320,             // 2026년 최저시급
  MIN_MONTHLY_WAGE: 2156880,          // 주 40시간 기준 월 최저임금
  MIN_MONTHLY_WAGE_APPROX: 2160000,   // 안내용 근사값
  MIN_MONTHLY_WAGE_40H: 2156880,      // 기존 호환성 (주 40시간 기준 월 최저임금)
  
  // === 주휴수당 ===
  WEEKLY_HOLIDAY_THRESHOLD: 15,       // 주 15시간 이상 시 주휴수당 발생
  
  // === 근로시간 기준 ===
  MAX_WEEKLY_HOURS: 40,               // 법정 주 근로시간
  MAX_OVERTIME_HOURS: 12,             // 주 최대 연장근로
  MAX_TOTAL_WEEKLY: 52,               // 주 최대 총 근로시간 (40+12)
  
  // === 휴게시간 (분) ===
  BREAK_4H: 30,                       // 4시간 근무 시 최소 휴게
  BREAK_8H: 60,                       // 8시간 근무 시 최소 휴게
  BREAK_REQUIRED_4H: 30,              // 기존 호환성 (4시간 근무 시 30분 휴게)
  BREAK_REQUIRED_8H: 60,              // 기존 호환성 (8시간 근무 시 60분 휴게)
  
  // === 연장/야간근로 ===
  OVERTIME_RATE: 1.5,                 // 연장/야간 가산율 (50%)
  NIGHT_START: 22,                    // 야간근로 시작 시각 (22시)
  NIGHT_END: 6,                       // 야간근로 종료 시각 (06시)
  NIGHT_WORK_START: 22,               // 기존 호환성 (야간근로 시작 시각)
  
  // === 퇴직금 ===
  RETIREMENT_THRESHOLD_MONTHS: 12,    // 1년 이상 근무 시 퇴직금 발생
  
  // === 수습기간 ===
  MAX_PROBATION_MONTHS: 3,            // 수습기간 권장 최대
  PROBATION_MAX_MONTHS: 3,            // 기존 호환성 (수습기간 권장 최대)
  
  // === 경업금지 (판례 기준) ===
  NON_COMPETE_MAX_MONTHS: 12,         // 권장 최대 기간 (1년)
  NON_COMPETE_MAX_RADIUS_KM: 3,       // 권장 최대 반경
  NON_COMPETE_PAY_RATE: 0.1,          // 권장 대가 비율 (급여의 10%, 기본값)
  NON_COMPETE_MAX_RATE: 0.3,          // 권장 최대 대가 비율 (급여의 30%)
  NON_COMPETE_MAX_KM: 3,              // 기존 호환성 (권장 최대 반경)
  NON_COMPETE_MIN_RATIO: 0.1,         // 기존 호환성 (대가 최소 비율, 10%)
  
  // === 상수 ===
  WEEKS_PER_MONTH: 4.345,             // 월평균 주수
} as const;
