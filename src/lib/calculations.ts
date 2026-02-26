import { LEGAL_STANDARDS } from '@/constants/legalStandards';

/**
 * 주휴시간 계산 (법정 산식)
 * 주휴시간 = 1일 소정근로시간 = min(주소정근로시간, 40) ÷ 근무일수
 * - 최대 8시간
 * - 주 15시간 미만이면 0
 */
export function calculateWeeklyHolidayHours(weeklyHours: number, workDays: number = 5): number {
  if (weeklyHours < LEGAL_STANDARDS.WEEKLY_HOLIDAY_THRESHOLD) return 0;
  const cappedWeeklyHours = Math.min(weeklyHours, LEGAL_STANDARDS.MAX_WEEKLY_HOURS);
  return Math.min(cappedWeeklyHours / workDays, 8);
}

/**
 * 월소정근로시간 계산
 * 월소정근로시간 = (주당 근무시간 + 주휴시간) × 4.345주
 */
export function calculateMonthlyTotalHours(weeklyHours: number, workDays: number = 5): number {
  const cappedWeeklyHours = Math.min(weeklyHours, LEGAL_STANDARDS.MAX_WEEKLY_HOURS);
  const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyHours, workDays);
  const monthlyHours = (cappedWeeklyHours + weeklyHolidayHours) * LEGAL_STANDARDS.WEEKS_PER_MONTH;
  return Math.round(monthlyHours * 100) / 100;
}

/**
 * 최저임금 계산 (주휴수당 포함)
 * 최저월급 = 월소정근로시간 × 최저시급
 */
export function calculateMinWage(weeklyHours: number): number {
  const monthlyHours = calculateMonthlyTotalHours(weeklyHours);
  return Math.ceil(monthlyHours * LEGAL_STANDARDS.MIN_HOURLY_WAGE / 10) * 10; // 십원단위 절상
}

/**
 * 최저임금 계산 (비율제용: 총 근로시간 기준)
 * 최저월급 = 총 근로시간(연장 포함) × 최저시급
 */
export const calculateMinWageByTotalWorkHours = (weeklyTotalWorkHours: number) => {
  const weeks = LEGAL_STANDARDS.WEEKS_PER_MONTH; // 4.345
  const monthlyTotalWorkHours = weeklyTotalWorkHours * weeks;
  const minHourly =
    (LEGAL_STANDARDS as { MINIMUM_WAGE_2026?: number; MINIMUM_WAGE?: number }).MINIMUM_WAGE_2026 ??
    (LEGAL_STANDARDS as { MINIMUM_WAGE_2026?: number; MINIMUM_WAGE?: number }).MINIMUM_WAGE ??
    LEGAL_STANDARDS.MIN_HOURLY_WAGE;
  return Math.round(minHourly * monthlyTotalWorkHours);
};

/**
 * 근무시간 기반 계산
 */
export function calculateWorkHours(weeklyHours: number, workDays: number) {
  const dailyHours = weeklyHours / workDays;
  const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyHours, workDays);
  const monthlyWorkHours = calculateMonthlyTotalHours(weeklyHours, workDays);
  
  return {
    dailyHours: Math.round(dailyHours * 100) / 100,
    weeklyHolidayHours: Math.round(weeklyHolidayHours * 100) / 100,
    monthlyWorkHours: Math.round(monthlyWorkHours * 100) / 100,
  };
}

/**
 * 고정급 급여 계산
 */
export function calculateFixedSalary(
  baseSalary: number,
  monthlyWorkHours: number,
  weeklyHolidayHours: number,
  allowances: {
    meal: number;
    transport: number;
    position: number;
    other: number;
    nonCompete: number;
  }
) {
  const tempHourlyRate = baseSalary / monthlyWorkHours;
  const weeklyHolidayPay = Math.round(tempHourlyRate * weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH);
  const hourlyRate = Math.round(
    (baseSalary + weeklyHolidayPay + allowances.meal + allowances.transport + allowances.position) / monthlyWorkHours
  );
  const totalAllowances = allowances.meal + allowances.transport + allowances.position + allowances.other;
  const totalSalary = baseSalary + totalAllowances + allowances.nonCompete;
  
  return {
    hourlyRate,
    weeklyHolidayPay,
    totalAllowances,
    totalSalary,
  };
}

/**
 * 비율제 급여 계산
 */
export function calculatePercentageSalary(
  minGuarantee: number,
  monthlyWorkHours: number,
  weeklyHolidayHours: number
) {
  const provisionalRate = minGuarantee / monthlyWorkHours;
  const provisionalHolidayPay = Math.round(provisionalRate * weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH);
  const baseSalary = minGuarantee - provisionalHolidayPay;
  
  return {
    provisionalRate: Math.round(provisionalRate),
    provisionalHolidayPay,
    baseSalary,
  };
}

/**
 * 최저임금 검증
 */
export function checkMinimumWage(hourlyRate: number): boolean {
  return hourlyRate >= LEGAL_STANDARDS.MIN_HOURLY_WAGE;
}

/**
 * 휴게시간 계산
 */
export function getRequiredBreak(dailyWorkHours: number): number {
  if (dailyWorkHours >= 8) return LEGAL_STANDARDS.BREAK_REQUIRED_8H;
  if (dailyWorkHours >= 4) return LEGAL_STANDARDS.BREAK_REQUIRED_4H;
  return 0;
}
