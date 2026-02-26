'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';
import {
  calculateMinWage,
  calculateWeeklyHolidayHours,
  calculateMonthlyTotalHours
} from '@/lib/calculations';
import {
  calcFixedOrdinarySplit,
  calcFixedTotalMonthlyPayFromBase,
  calcPercentageMinimumGuarantee,
  getOrdinaryHoursForRecalc
} from '@/lib/calculations/wage';
import { LEGAL_STANDARDS } from '@/constants/legalStandards';

export default function Step8Page() {
  const router = useRouter();
  const { academy, instructor, contractPeriod, workCondition, salary, protection, specialTerms, calculated } = useWizardStore();

  const formatCurrency = (value: number) => value.toLocaleString('ko-KR');

  // 근로시간 정보 안전하게 가져오기 (calculated 값 fallback 추가)
  const weeklyHours = workCondition.weeklyHours || calculated.weeklyHours || 0;
  const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyHours);
  const monthlyTotalHours = calculateMonthlyTotalHours(weeklyHours);
  const percentageMinimum = calcPercentageMinimumGuarantee({
    weeklyHours,
    weeklyHolidayHours,
    minHourlyWage: LEGAL_STANDARDS.MIN_HOURLY_WAGE,
    baseSalary: salary.percentageBaseSalary || 0,
    meal: salary.mealAllowance || 0,
    transport: salary.transportAllowance || 0,
    position: salary.positionAllowance || 0,
    other: salary.otherAllowance || 0,
  });
  const weeklyPaidHours = percentageMinimum.weeklyPaidHours;
  const monthlyPaidHours = percentageMinimum.monthlyPaidHours;

  const { monthlyOrdinaryWorkHours, monthlyHolidayHours, totalOrdinaryPaidHours } =
    getOrdinaryHoursForRecalc(weeklyHours, weeklyHolidayHours);

  const minWageTotal =
    salary.type === 'PERCENTAGE'
      ? percentageMinimum.minMonthlyWage
      : calculateMinWage(weeklyHours);

  const getTotalSalary = () => {
    if (salary.type === 'FIXED') {
      const weeklyHolidayPay = getFixedWeeklyHolidayPay();
      return salary.baseSalary + weeklyHolidayPay + salary.mealAllowance + salary.transportAllowance +
             salary.positionAllowance + salary.otherAllowance + salary.overtimeAllowance +
             (protection.hasNonCompete ? protection.nonCompeteCompensation : 0);
    }
    if (salary.type === 'PERCENTAGE') {
      const minGuarantee = percentageMinimum.minGuarantee;
      const separatePay = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
      const percentageResult = salary.minGuarantee || 0;
      return Math.max(percentageResult, minGuarantee) + separatePay + (salary.overtimeAllowance || 0);
    }
    if (salary.type === 'HOURLY') {
      // 시급제: 기본급 + 주휴수당 + 비과세 + 추가수당
      const monthlyBase = Math.round(salary.hourlyWage * weeklyHours * LEGAL_STANDARDS.WEEKS_PER_MONTH);
      const holidayPay = weeklyHours >= 15
        ? Math.round(salary.hourlyWage * weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH)
        : 0;
      return monthlyBase + holidayPay + salary.mealAllowance + salary.transportAllowance + 
             salary.positionAllowance + salary.otherAllowance + salary.overtimeAllowance;
    }
    return 0;
  };

  // 고정급용 주휴수당 계산 함수
  const getFixedWeeklyHolidayPay = () => {
    if (salary.type !== 'FIXED') return 0;
    const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
    const totalMonthlyPay = calcFixedTotalMonthlyPayFromBase({
      baseSalary: salary.baseSalary,
      weeklyHours,
      weeklyHolidayHours,
      meal: salary.mealAllowance,
      transport: salary.transportAllowance,
      position: salary.positionAllowance,
      other: salary.otherAllowance,
      overtime: salary.overtimeAllowance,
      nonCompete,
    });
    const split = calcFixedOrdinarySplit({
      totalMonthlyPay,
      weeklyHours,
      weeklyHolidayHours,
      meal: salary.mealAllowance,
      transport: salary.transportAllowance,
      position: salary.positionAllowance,
      other: salary.otherAllowance,
      overtime: salary.overtimeAllowance,
      nonCompete,
    });
    return split.holidayPay;
  };

  return (
    <>
      <ProgressBar currentStep={8} />
      <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-navy mb-2">계약 내용 확인</h1>
      <p className="text-gray-600 mb-8">입력하신 내용을 확인해주세요.</p>
      
      <div className="space-y-6">
        {/* 강사 정보 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-navy mb-2">강사 정보</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">이름:</span> {instructor.name}</div>
            <div><span className="text-gray-500">담당과목:</span> {instructor.subject}</div>
          </div>
        </div>

        {/* 학원 정보 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-navy mb-2">학원 정보</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">학원명:</span> {academy.name}</div>
            <div><span className="text-gray-500">대표자:</span> {academy.representative}</div>
          </div>
        </div>

        {/* 계약 기간 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-navy mb-2">계약 기간</h3>
          <p className="text-sm">{contractPeriod.startDate} ~ {contractPeriod.endDate}</p>
          {contractPeriod.probationMonths > 0 && (
            <p className="text-sm text-gray-500">수습기간: {contractPeriod.probationMonths}개월</p>
          )}
        </div>

        {/* 근무 조건 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-navy mb-2">근무 조건</h3>
          <div className="text-sm space-y-1">
            <p>주당 근무시간: {weeklyHours}시간</p>
            {salary.type === 'PERCENTAGE' ? (
              <>
                <p>주 유급시간(실근로+주휴): {weeklyPaidHours.toFixed(1)}시간</p>
                <p>월 유급시간(환산): {monthlyPaidHours.toFixed(2)}시간</p>
                <p>최저월급(유급시간 기준): {formatCurrency(minWageTotal)}원</p>
              </>
            ) : (
              <p>
                월 통상시간: {totalOrdinaryPaidHours.toFixed(1)}시간
                (소정 {monthlyOrdinaryWorkHours.toFixed(1)} + 주휴 {monthlyHolidayHours.toFixed(1)})
              </p>
            )}
          </div>
        </div>

        {/* 급여 */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-navy mb-2">💰 급여 내역</h3>
          <div className="text-sm space-y-1">
            {salary.type === 'FIXED' && (
              <>
                <div className="flex justify-between">
                  <span>기본급</span>
                  <span>{formatCurrency(salary.baseSalary)}원</span>
                </div>
                {getFixedWeeklyHolidayPay() > 0 && (
                  <div className="flex justify-between">
                    <span>주휴수당</span>
                    <span>{formatCurrency(getFixedWeeklyHolidayPay())}원</span>
                  </div>
                )}
              </>
            )}
            {salary.type === 'PERCENTAGE' && (
              <>
                {(() => {
                  const 주휴수당 = percentageMinimum.weeklyHolidayPay;
                  const 최소보장금액 = percentageMinimum.minGuarantee + (salary.overtimeAllowance || 0);
                  const 별도지급소계 = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                  const 매출기준금액 = salary.minGuarantee || 0;
                  const 총지급액 = Math.max(매출기준금액, 최소보장금액) + 별도지급소계;
                  
                  return (
                    <>
                      {/* 급여 산정 방식 */}
                      <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">📌 급여 산정 방식</p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-300 text-center">
                            <p className="text-xs text-gray-500">매출 기준</p>
                            <p className="font-bold text-blue-800">매출 × {salary.revenueRatio}%</p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">VS</span>
                          <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-300 text-center">
                            <p className="text-xs text-gray-500">최소 보장</p>
                            <p className="font-bold text-blue-800">{formatCurrency(최소보장금액)}원</p>
                          </div>
                        </div>
                        <p className="text-center mt-2 text-sm text-blue-700">
                          👉 <strong>둘 중 큰 금액</strong>을 매월 지급합니다.
                        </p>
                      </div>

                      {/* 최소 보장 금액 상세 */}
                      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">🛡️ 최소 보장 금액</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">기본급</span>
                            <span>{formatCurrency(salary.percentageBaseSalary || 0)}원</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">주휴수당</span>
                            <span>{formatCurrency(주휴수당)}원</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">식대 <span className="text-green-600 text-xs">(비과세)</span></span>
                            <span>{formatCurrency(salary.mealAllowance)}원</span>
                          </div>
                          {salary.transportAllowance > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-gray-600">자가운전보조금 <span className="text-green-600 text-xs">(비과세)</span></span>
                              <span>{formatCurrency(salary.transportAllowance)}원</span>
                            </div>
                          )}
                          {(salary.overtimeAllowance || 0) > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-red-600">연장근로수당</span>
                              <span className="text-red-600">{formatCurrency(salary.overtimeAllowance)}원</span>
                            </div>
                          )}
                          {salary.positionAllowance > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-gray-600">직책수당</span>
                              <span>{formatCurrency(salary.positionAllowance)}원</span>
                            </div>
                          )}
                          {salary.otherAllowance > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-gray-600">기타수당 {salary.otherAllowanceMemo && `(${salary.otherAllowanceMemo})`}</span>
                              <span>{formatCurrency(salary.otherAllowance)}원</span>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-gray-200 mt-2 pt-2">
                          <div className="flex justify-between font-semibold text-blue-800">
                            <span>최소 보장 금액</span>
                            <span>{formatCurrency(최소보장금액)}원</span>
                          </div>
                        </div>
                      </div>

                      {/* 별도 지급 항목 */}
                      {(protection.hasNonCompete && protection.nonCompeteCompensation > 0) && (
                        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm font-medium text-amber-800 mb-2">📋 별도 지급 항목</p>
                          <div className="space-y-1 text-sm">
                            {protection.hasNonCompete && protection.nonCompeteCompensation > 0 && (
                              <div className="flex justify-between py-1">
                                <span className="text-amber-700">경업금지약정대가</span>
                                <span className="text-amber-800">{formatCurrency(protection.nonCompeteCompensation)}원</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 월 총 지급액 */}
                      <div className="p-3 bg-navy rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">월 총 지급액 (세전)</span>
                          <span className="font-bold text-white text-xl">{formatCurrency(총지급액)}원</span>
                        </div>
                        <p className="text-xs text-blue-200 mt-1 text-right">
                          매출 기준과 최소 보장 중 큰 금액 + 별도 지급
                        </p>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
            {salary.type === 'HOURLY' && (
              <>
                <div className="flex justify-between">
                  <span>시급</span>
                  <span>{formatCurrency(salary.hourlyWage)}원</span>
                </div>
                {weeklyHours > 0 && (
                  <div className="flex justify-between">
                    <span>기본급 ({formatCurrency(salary.hourlyWage)}원 × {weeklyHours}시간 × 4.345주)</span>
                    <span>{formatCurrency(Math.round(salary.hourlyWage * weeklyHours * LEGAL_STANDARDS.WEEKS_PER_MONTH))}원</span>
                  </div>
                )}
                {weeklyHours >= 15 && (
                  <div className="flex justify-between">
                    <span>주휴수당 ({formatCurrency(salary.hourlyWage)}원 × {weeklyHolidayHours.toFixed(1)}시간 × 4.345주)</span>
                    <span>{formatCurrency(Math.round(salary.hourlyWage * weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH))}원</span>
                  </div>
                )}
              </>
            )}
            {salary.type !== 'PERCENTAGE' && salary.mealAllowance > 0 && (
              <div className="flex justify-between">
                <span>식대 <span className="text-green-600">(비과세)</span></span>
                <span>{formatCurrency(salary.mealAllowance)}원</span>
              </div>
            )}
            {salary.type !== 'PERCENTAGE' && salary.overtimeAllowance > 0 && (
              <div className="flex justify-between text-red-700">
                <span>연장근로수당</span>
                <span>{formatCurrency(salary.overtimeAllowance)}원</span>
              </div>
            )}
            {salary.transportAllowance > 0 && (
              <div className="flex justify-between">
                <span>자가운전보조금 <span className="text-green-600">(비과세)</span></span>
                <span>{formatCurrency(salary.transportAllowance)}원</span>
              </div>
            )}
            {salary.type !== 'PERCENTAGE' && ((protection.hasNonCompete && protection.nonCompeteCompensation > 0) || salary.positionAllowance > 0 || salary.otherAllowance > 0) && (
              <>
                <div className="flex justify-between font-semibold text-amber-700 mt-3">
                  <span>📋 별도 지급 항목</span>
                </div>
                {salary.positionAllowance > 0 && (
                  <div className="flex justify-between pl-4 text-amber-700">
                    <span>직책수당</span>
                    <span>{formatCurrency(salary.positionAllowance)}원</span>
                  </div>
                )}
                {salary.otherAllowance > 0 && (
                  <div className="flex justify-between pl-4 text-amber-700">
                    <span>기타수당{salary.otherAllowanceMemo ? ` (${salary.otherAllowanceMemo})` : ''}</span>
                    <span>{formatCurrency(salary.otherAllowance)}원</span>
                  </div>
                )}
                {protection.hasNonCompete && protection.nonCompeteCompensation > 0 && (
                  <div className="flex justify-between pl-4 text-amber-700">
                    <span>경업금지약정대가</span>
                    <span>{formatCurrency(protection.nonCompeteCompensation)}원</span>
                  </div>
                )}
              </>
            )}
            <div className="border-t pt-2 mt-2 font-semibold flex justify-between">
              <span>월 총 지급액 (세전)</span>
              <span className="text-navy">{formatCurrency(getTotalSalary())}원</span>
            </div>
          </div>
        </div>

        {/* 경업금지 */}
        {protection.hasNonCompete && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-navy mb-2">🔒 경업금지약정</h3>
            <div className="text-sm space-y-1">
              <p>기간: {protection.nonCompetePeriod}개월</p>
              <p>범위: 학원으로부터 반경 {protection.nonCompeteRadius}km</p>
              <p>대가: 월 {formatCurrency(protection.nonCompeteCompensation)}원</p>
            </div>
          </div>
        )}

        {/* 특약사항 */}
        {specialTerms && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-navy mb-2">특약사항</h3>
            <p className="text-sm whitespace-pre-wrap">{specialTerms}</p>
          </div>
        )}
      </div>

      <NavigationButtons
        onPrevious={() => router.push('/wizard/type-a/step-7')}
        onNext={() => router.push('/wizard/type-a/preview')}
        canGoNext={true}
        nextLabel="계약서 미리보기"
      />
      </div>
    </>
  );
}
