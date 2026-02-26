import { LEGAL_STANDARDS } from '@/constants/legalStandards';

export const getOrdinaryHoursForRecalc = (weeklyHours: number, weeklyHolidayHours: number) => {
  const weeklyOrdinaryWorkHours = Math.min(weeklyHours, LEGAL_STANDARDS.MAX_WEEKLY_HOURS);
  const monthlyOrdinaryWorkHours = weeklyOrdinaryWorkHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
  const monthlyHolidayHours = weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
  const totalOrdinaryPaidHours = monthlyOrdinaryWorkHours + monthlyHolidayHours;
  return { monthlyOrdinaryWorkHours, monthlyHolidayHours, totalOrdinaryPaidHours };
};

export const calcFixedOrdinarySplit = (args: {
  totalMonthlyPay: number;
  weeklyHours: number;
  weeklyHolidayHours: number;
  meal: number;
  transport: number;
  position: number;
  other: number;
  overtime: number;
  nonCompete: number;
}) => {
  const { totalMonthlyPay, weeklyHours, weeklyHolidayHours, meal, transport, position, other, overtime, nonCompete } = args;

  const { monthlyOrdinaryWorkHours: mo, monthlyHolidayHours: mh, totalOrdinaryPaidHours: T } =
    getOrdinaryHoursForRecalc(weeklyHours, weeklyHolidayHours);

  const A = (meal || 0) + (transport || 0) + (position || 0) + (other || 0);
  const totalPool = totalMonthlyPay - (overtime || 0) - (nonCompete || 0);
  const AB = T > 0 ? totalPool * (mo / T) : 0;
  const baseSalary = Math.max(0, Math.round(AB - A));
  const holidayPay = mo > 0 ? Math.max(0, Math.round(AB * (mh / mo))) : 0;
  const ordinaryMonthlyWage = A + baseSalary + holidayPay;
  const ordinaryHourly = T > 0 ? ordinaryMonthlyWage / T : 0;

  return { baseSalary, holidayPay, ordinaryHourly, mo, mh, T, A, totalPool, AB };
};

export const calcFixedTotalMonthlyPayFromBase = (args: {
  baseSalary: number;
  weeklyHours: number;
  weeklyHolidayHours: number;
  meal: number;
  transport: number;
  position: number;
  other: number;
  overtime: number;
  nonCompete: number;
}) => {
  const { baseSalary, weeklyHours, weeklyHolidayHours, meal, transport, position, other, overtime, nonCompete } = args;
  const { totalOrdinaryPaidHours: T, monthlyHolidayHours: mh } = getOrdinaryHoursForRecalc(weeklyHours, weeklyHolidayHours);
  const A = (meal || 0) + (transport || 0) + (position || 0) + (other || 0);
  const ordinaryMonthlyWage = A + (baseSalary || 0);
  const ordinaryHourly = T > 0 ? ordinaryMonthlyWage / T : 0;
  const holidayPay = mh > 0 ? Math.round(ordinaryHourly * mh) : 0;

  return (baseSalary || 0) + holidayPay + A + (overtime || 0) + (nonCompete || 0);
};

export const calcPercentageMinimumGuarantee = (args: {
  weeklyHours: number;
  weeklyHolidayHours: number;
  minHourlyWage: number;
  baseSalary: number;
  meal: number;
  transport: number;
  position: number;
  other: number;
}) => {
  const { weeklyHours, weeklyHolidayHours, minHourlyWage, baseSalary, meal, transport, position, other } = args;
  const weeklyPaidHours = weeklyHours + weeklyHolidayHours;
  const monthlyPaidHours = weeklyPaidHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
  const minMonthlyWage = Math.floor(minHourlyWage * monthlyPaidHours);
  const weeklyHolidayPay = Math.round((baseSalary || 0) * 0.2);
  const minGuarantee =
    (baseSalary || 0) +
    weeklyHolidayPay +
    (meal || 0) +
    (transport || 0) +
    (position || 0) +
    (other || 0);

  return { weeklyPaidHours, monthlyPaidHours, minMonthlyWage, weeklyHolidayPay, minGuarantee };
};
