'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';
import SalaryModal from '@/components/wizard/SalaryModal';
import { LEGAL_STANDARDS } from '@/constants/legalStandards';
import { calculateWeeklyHolidayHours, calculateMonthlyTotalHours } from '@/lib/calculations';

export default function Step3Page() {
  const router = useRouter();
  const { salary, updateSalary, workCondition, calculated, recalculate, protection, updateProtection } = useWizardStore();
  const [hasVehicle, setHasVehicle] = useState(false); // 기본값: 자가운전보조금 미선택
  const [includeFixedAllowancesInGuarantee, setIncludeFixedAllowancesInGuarantee] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasShownNonCompeteNotice, setHasShownNonCompeteNotice] = useState(false);
  // 급여 방식이 선택되지 않았거나 baseSalary가 0이면 모든 카드 표시
  const [showAllSalaryTypes, setShowAllSalaryTypes] = useState(
    !salary.type || 
    (salary.type === 'FIXED' && salary.baseSalary === 0) ||
    (salary.type === 'PERCENTAGE' && salary.minGuarantee === 0) ||
    (salary.type === 'HOURLY' && salary.hourlyWage === 0)
  );
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'warning' | 'info' | 'error';
    title: string;
    content: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
  } | null>(null);
  
  // 고정급 총액 입력용 별도 state
  const [fixedTotalInput, setFixedTotalInput] = useState(() => {
    // 고정급인 경우 기본값 300만원
    if (salary.type === 'FIXED') {
      return 3000000;
    }
    const total = salary.baseSalary + salary.mealAllowance + salary.transportAllowance + 
                  salary.positionAllowance + salary.otherAllowance + 
                  (protection.hasNonCompete ? protection.nonCompeteCompensation : 0);
    return total > 0 ? total : 0;
  });

  // workCondition에서 직접 주당 근로시간 가져오기
  const weeklyHours = workCondition.weeklyHours || calculated.weeklyHours || 0;
  const workDays = workCondition.workDays || 5;
  const dailyHours = calculated.dailyHours || (weeklyHours / workDays);
  const overtimeWeeklyHours = Math.max(weeklyHours - LEGAL_STANDARDS.MAX_WEEKLY_HOURS, 0);
  const overtimeRequired = overtimeWeeklyHours > 0;
  
  // 주휴시간 계산 (법정 산식): min(주 소정근로시간, 40) ÷ 근무일수 (최대 8시간, 주 15시간 이상 시)
  const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyHours, workDays);
  
  // 월 환산 시간 = (min(주 소정근로시간, 40) + 주휴시간) × 4.345주 (소수점 둘째 자리 반올림)
  const monthlyTotalHours = calculateMonthlyTotalHours(weeklyHours, workDays);
  
  const getMinimumWageMonthlyHours = (weeklyHours: number, weeklyHolidayHours: number) => {
    // 최저임금은 소정근로(주40 상한) + 주휴 기준(연장 제외)
    const weeklyOrdinary = Math.min(weeklyHours, LEGAL_STANDARDS.MAX_WEEKLY_HOURS);
    const raw = (weeklyOrdinary + weeklyHolidayHours) * LEGAL_STANDARDS.WEEKS_PER_MONTH;
    // 정부 안내 실무와 맞추기 위해 209시간 기준(올림)
    return Math.ceil(raw); // 208.56 -> 209
  };

  // 최저임금 계산
  const minimumWageMonthlyHours = getMinimumWageMonthlyHours(weeklyHours, weeklyHolidayHours);
  const minWageTotal = Math.round(minimumWageMonthlyHours * LEGAL_STANDARDS.MIN_HOURLY_WAGE);
  const weeklyPaidHours = weeklyHours + weeklyHolidayHours;
  const monthlyPaidHours = weeklyPaidHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
  const minWageTotalForPercentage = Math.floor(LEGAL_STANDARDS.MIN_HOURLY_WAGE * monthlyPaidHours);

  const fixedAllowancesForGuarantee = includeFixedAllowancesInGuarantee
    ? (salary.positionAllowance || 0) + (salary.otherAllowance || 0)
    : 0;

  const getOrdinaryHoursForRecalc = (weeklyHours: number, weeklyHolidayHours: number) => {
    const weeklyOrdinaryWorkHours = Math.min(weeklyHours, LEGAL_STANDARDS.MAX_WEEKLY_HOURS); // 주40 상한
    const monthlyOrdinaryWorkHours = weeklyOrdinaryWorkHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
    const monthlyHolidayHours = weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
    const totalOrdinaryPaidHours = monthlyOrdinaryWorkHours + monthlyHolidayHours;
    return { monthlyOrdinaryWorkHours, monthlyHolidayHours, totalOrdinaryPaidHours };
  };

  const calcFixedOrdinarySplit = (args: {
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

    // 통상임금 풀(연장/경업금지 제외)
    const totalPool = totalMonthlyPay - (overtime || 0) - (nonCompete || 0);

    // A+B = totalPool * (mo/T)
    const AB = T > 0 ? (totalPool * (mo / T)) : 0;

    // B = AB - A
    const baseSalary = Math.max(0, Math.round(AB - A));

    // H = (A+B) * (mh/mo)
    const holidayPay = mo > 0 ? Math.max(0, Math.round(AB * (mh / mo))) : 0;

    // 통상시급(주휴 산정 기준)
    const ordinaryMonthlyWage = A + baseSalary + holidayPay; // = totalPool (반올림 오차 가능)
    const ordinaryHourly = T > 0 ? ordinaryMonthlyWage / T : 0;

    return { baseSalary, holidayPay, ordinaryHourly, mo, mh, T, A, totalPool, AB };
  };
  // 연장수당 계산: 순환 참조 방지를 위해 totalInput 기반으로 계산
  const calcMinimumOvertimePay = (totalInput: number) => {
    if (!overtimeRequired) return 0;

    if (salary.type === 'HOURLY') {
      const hourly = salary.hourlyWage || 0;
      return Math.round(
        overtimeWeeklyHours * Math.max(LEGAL_STANDARDS.MIN_HOURLY_WAGE, hourly) *
        LEGAL_STANDARDS.OVERTIME_RATE * LEGAL_STANDARDS.WEEKS_PER_MONTH
      );
    }

    if (salary.type === 'FIXED') {
      const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
      // 수렴 계산: overtime과 통상시급이 서로 의존하므로 반복으로 수렴
      let currentOvertime = 0;
      for (let i = 0; i < 5; i++) {
        const tempSplit = calcFixedOrdinarySplit({
          totalMonthlyPay: totalInput,
          weeklyHours,
          weeklyHolidayHours,
          meal: salary.mealAllowance,
          transport: salary.transportAllowance,
          position: salary.positionAllowance,
          other: salary.otherAllowance,
          overtime: currentOvertime,
          nonCompete,
        });
        const ordinaryHourly = tempSplit.ordinaryHourly;
        const newOvertime = Math.round(
          overtimeWeeklyHours * Math.max(LEGAL_STANDARDS.MIN_HOURLY_WAGE, ordinaryHourly) *
          LEGAL_STANDARDS.OVERTIME_RATE * LEGAL_STANDARDS.WEEKS_PER_MONTH
        );
        if (Math.abs(newOvertime - currentOvertime) <= 1) break; // 수렴 완료
        currentOvertime = newOvertime;
      }
      return currentOvertime;
    }

    if (salary.type === 'PERCENTAGE') {
      const baseSalary = salary.percentageBaseSalary || 0;
      const weeklyOrdinaryWorkHours = Math.min(weeklyHours, LEGAL_STANDARDS.MAX_WEEKLY_HOURS);
      const monthlyOrdinaryWorkHours = weeklyOrdinaryWorkHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
      const monthlyHolidayHoursCalc = weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH;
      const hourly = monthlyOrdinaryWorkHours > 0 ? baseSalary / monthlyOrdinaryWorkHours : 0;
      const monthlyHolidayPay = Math.round(hourly * monthlyHolidayHoursCalc);
      const ordinaryWage = baseSalary + monthlyHolidayPay + (salary.mealAllowance || 0);
      const totalOrdinaryHours = monthlyOrdinaryWorkHours + monthlyHolidayHoursCalc;
      const ordinaryHourly = totalOrdinaryHours > 0 ? ordinaryWage / totalOrdinaryHours : 0;
      return Math.round(
        overtimeWeeklyHours * Math.max(LEGAL_STANDARDS.MIN_HOURLY_WAGE, ordinaryHourly) *
        LEGAL_STANDARDS.OVERTIME_RATE * LEGAL_STANDARDS.WEEKS_PER_MONTH
      );
    }

    return 0;
  };

  const minimumOvertimePay = calcMinimumOvertimePay(
    salary.type === 'FIXED' ? fixedTotalInput : 0
  );

  // 페이지 진입 시 자동 세팅
  useEffect(() => {
    recalculate();
    
    // 고정급 선택 시 기본값 300만원 설정
    if (salary.type === 'FIXED') {
      if (fixedTotalInput === 0) {
        setFixedTotalInput(3000000);
      }
      
      // 고정급이고 아직 초기화되지 않았으면 기본 세팅
      if (!isInitialized && salary.baseSalary === 0 && weeklyHours > 0) {
        const mealAllowance = 200000;
        const transportAllowance = 0; // 기본값: 자가운전보조금 미선택
        
        // 총액이 300만원이므로 이를 기반으로 역산
        const total = fixedTotalInput > 0 ? fixedTotalInput : 3000000;
        
        const split = calcFixedOrdinarySplit({
          totalMonthlyPay: total,
          weeklyHours,
          weeklyHolidayHours,
          meal: mealAllowance,
          transport: transportAllowance,
          position: salary.positionAllowance,
          other: salary.otherAllowance,
          overtime: salary.overtimeAllowance,
          nonCompete: protection.hasNonCompete ? protection.nonCompeteCompensation : 0,
        });
        
        updateSalary({
          baseSalary: split.baseSalary,
          mealAllowance: mealAllowance,
          transportAllowance: transportAllowance
        });
        setIsInitialized(true);
      }
    }
  }, [weeklyHours, salary.type, fixedTotalInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // 40시간 초과 시 연장수당 자동 적용
  useEffect(() => {
    if (overtimeRequired && minimumOvertimePay > 0) {
      if (salary.overtimeAllowance !== minimumOvertimePay) {
        if (salary.type === 'FIXED') {
          const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
          const { baseSalary } = calcFixedOrdinarySplit({
            totalMonthlyPay: fixedTotalInput,
            weeklyHours,
            weeklyHolidayHours,
            meal: salary.mealAllowance,
            transport: salary.transportAllowance,
            position: salary.positionAllowance,
            other: salary.otherAllowance,
            overtime: minimumOvertimePay,
            nonCompete,
          });
          updateSalary({ overtimeAllowance: minimumOvertimePay, baseSalary });
        } else {
          updateSalary({ overtimeAllowance: minimumOvertimePay });
        }
      }
    }
  }, [minimumOvertimePay, overtimeRequired]); // eslint-disable-line react-hooks/exhaustive-deps

  // 비율제: 최소보장금액 변경 시 경업금지대가 자동 계산
  useEffect(() => {
    if (salary.type === 'PERCENTAGE' && protection.hasNonCompete) {
      const calculatedWeeklyPay = Math.round((salary.percentageBaseSalary || 0) * 0.2);
      // 최소보장금액 = 기본급 + 주휴수당 + 식대만
      const minGuarantee = (salary.percentageBaseSalary || 0) + calculatedWeeklyPay + salary.mealAllowance;
      
      if (minGuarantee > 0) {
        // 최소보장금의 10%를 계산하고 10만원 단위로 반올림
        const calculatedAmount = minGuarantee * 0.1;
        const newNonCompete = Math.round(Math.round(calculatedAmount) / 100000) * 100000;
        
        // 현재 값과 다를 때만 업데이트 (무한 루프 방지)
        if (protection.nonCompeteCompensation !== newNonCompete) {
          updateProtection({ nonCompeteCompensation: newNonCompete });
        }
      }
    }
  }, [salary.type, salary.percentageBaseSalary, salary.mealAllowance, salary.transportAllowance, protection.hasNonCompete]); // eslint-disable-line react-hooks/exhaustive-deps

  // 경업금지 대가 자동 계산 함수
  const calculateNonCompeteCompensation = () => {
    if (salary.type === 'FIXED' && salary.baseSalary > 0) {
      return Math.round(salary.baseSalary * 0.1);
    }
    if (salary.type === 'PERCENTAGE' && salary.minGuarantee > 0) {
      return Math.round(salary.minGuarantee * 0.1);
    }
    if (salary.type === 'HOURLY' && salary.hourlyWage > 0) {
      return Math.round(salary.hourlyWage * weeklyHours * 4.345 * 0.1);
    }
    return 0;
  };
  
  const canGoNext = 
    ((salary.type === 'FIXED' && salary.baseSalary > 0) ||
      (salary.type === 'PERCENTAGE' && salary.percentageBaseSalary > 0 && salary.revenueRatio > 0) ||
      (salary.type === 'HOURLY' && salary.hourlyWage > 0)) &&
    (!overtimeRequired || salary.overtimeAllowance > 0);
  
  const handlePrevious = () => {
    router.push('/wizard/type-a/step-2');
  };
  
  const handleNext = () => {
    if (!canGoNext) return;

    // 기타수당 명칭 미입력 체크
    if (salary.otherAllowance > 0 && !salary.otherAllowanceMemo) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: '수당 명칭을 입력해주세요',
        content: (
          <div className="space-y-3">
            <p>기타 수당의 명칭이 입력되지 않았습니다.</p>
            <div>
              <p className="font-semibold mb-1">수당 명칭 예시:</p>
              <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                <li>교재연구비</li>
                <li>성과급</li>
                <li>자격수당</li>
              </ul>
            </div>
            <p className="text-xs text-gray-600">
              명칭이 없는 수당은 포괄임금 분쟁 시 불리하게 작용할 수 있습니다.
            </p>
          </div>
        ),
        confirmText: '입력하기',
        cancelText: '취소',
        showCancel: true,
        onConfirm: () => {
          setModalState(null);
          // 기타수당 입력란으로 포커스 이동 (실제로는 스크롤)
        }
      });
      return;
    }

    // 최저임금 미달 체크 (고정급)
    if (salary.type === 'FIXED' && fixedTotalInput > 0) {
      const nonCompeteAmount = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
      const overtimePay = salary.overtimeAllowance || 0;
      const hourlyRate = monthlyTotalHours > 0
        ? (fixedTotalInput - nonCompeteAmount - overtimePay) / monthlyTotalHours
        : 0;

      if (hourlyRate > 0 && hourlyRate < LEGAL_STANDARDS.MIN_HOURLY_WAGE) {
        const shortage = Math.round((LEGAL_STANDARDS.MIN_HOURLY_WAGE - hourlyRate) * monthlyTotalHours);
        setModalState({
          isOpen: true,
          type: 'error',
          title: '최저임금 미달 경고',
          content: (
            <div className="space-y-3">
              <p>현재 설정된 급여가 최저임금에 미달합니다.</p>
              <div className="space-y-1 text-sm">
                <p>• 계산된 시급: {formatCurrency(Math.round(hourlyRate))}원</p>
                <p>• {LEGAL_STANDARDS.YEAR}년 최저시급: {formatCurrency(LEGAL_STANDARDS.MIN_HOURLY_WAGE)}원</p>
                <p>• 부족액: 월 약 {formatCurrency(shortage)}원</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <p className="font-semibold text-sm mb-1">최저임금 미달 시:</p>
                <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                  <li>⚠️ 2년 이하 징역 또는 2천만원 이하 벌금</li>
                  <li>⚠️ 미지급 임금 + 지연이자(연 20%) 지급 의무</li>
                </ul>
              </div>
            </div>
          ),
          confirmText: '조정하기',
          cancelText: '취소',
          showCancel: true,
          onConfirm: () => {
            // 최저임금으로 자동 조정
            const minWageAmount = minWageTotal + salary.mealAllowance + salary.transportAllowance;
            setFixedTotalInput(minWageAmount);
            setModalState(null);
          }
        });
        return;
      }
    }

    // 최저임금 미달 체크 (시급제)
    if (salary.type === 'HOURLY' && salary.hourlyWage > 0 && salary.hourlyWage < LEGAL_STANDARDS.MIN_HOURLY_WAGE) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: '최저임금 미달 경고',
        content: (
          <div className="space-y-3">
            <p>입력하신 시급이 최저시급보다 낮습니다.</p>
            <div className="space-y-1 text-sm">
              <p>• 입력 시급: {formatCurrency(salary.hourlyWage)}원</p>
              <p>• {LEGAL_STANDARDS.YEAR}년 최저시급: {formatCurrency(LEGAL_STANDARDS.MIN_HOURLY_WAGE)}원</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <p className="font-semibold text-sm mb-1">최저임금 미달 시:</p>
              <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                <li>⚠️ 2년 이하 징역 또는 2천만원 이하 벌금</li>
                <li>⚠️ 미지급 임금 + 지연이자(연 20%) 지급 의무</li>
              </ul>
            </div>
          </div>
        ),
        confirmText: '조정하기',
        cancelText: '취소',
        showCancel: true,
        onConfirm: () => {
          updateSalary({ hourlyWage: LEGAL_STANDARDS.MIN_HOURLY_WAGE });
          setModalState(null);
        }
      });
      return;
    }

    recalculate();
    
    // 고정급인 경우 화면에 표시된 기본급을 store에 저장
    if (salary.type === 'FIXED' && fixedTotalInput > 0) {
      const nonCompeteAmount = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
      const { baseSalary } = calcFixedOrdinarySplit({
        totalMonthlyPay: fixedTotalInput,
        weeklyHours,
        weeklyHolidayHours,
        meal: salary.mealAllowance,
        transport: salary.transportAllowance,
        position: salary.positionAllowance,
        other: salary.otherAllowance,
        overtime: salary.overtimeAllowance,
        nonCompete: nonCompeteAmount,
      });
      
      updateSalary({ baseSalary });
    }
    
    router.push('/wizard/type-a/step-4');
  };
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('ko-KR');
  };
  
  // 숫자를 한글로 변환하는 함수
  const numberToKorean = (num: number): string => {
    if (num === 0) return '영';
    
    const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const units = ['', '십', '백', '천'];
    
    if (num < 10000) {
      if (num === 0) return '영';
      
      let result = '';
      const str = num.toString().padStart(4, '0');
      
      for (let i = 0; i < 4; i++) {
        const digit = parseInt(str[i]);
        const pos = 3 - i;
        
        if (digit > 0) {
          if (digit === 1 && pos > 0) {
            result += units[pos];
          } else {
            result += digits[digit] + units[pos];
          }
        }
      }
      return result;
    } else {
      const man = Math.floor(num / 10000);
      const remainder = num % 10000;
      
      let result = '';
      
      if (man > 0) {
        if (man < 10000) {
          const manStr = man.toString().padStart(4, '0');
          for (let i = 0; i < 4; i++) {
            const digit = parseInt(manStr[i]);
            const pos = 3 - i;
            if (digit > 0) {
              if (digit === 1 && pos > 0) {
                result += units[pos];
              } else {
                result += digits[digit] + units[pos];
              }
            }
          }
        } else {
          result = numberToKorean(man);
        }
        result += '만';
      }
      
      if (remainder > 0) {
        const remStr = remainder.toString().padStart(4, '0');
        for (let i = 0; i < 4; i++) {
          const digit = parseInt(remStr[i]);
          const pos = 3 - i;
          if (digit > 0) {
            if (digit === 1 && pos > 0) {
              result += units[pos];
            } else {
              result += digits[digit] + units[pos];
            }
          }
        }
      }
      
      return result;
    }
  };
  
  // 입력값을 숫자로 변환 (콤마 제거)
  const parseNumber = (value: string): number => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };
  
  // 숫자를 콤마가 포함된 문자열로 변환
  const formatNumberInput = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseNumber(value) : value;
    return num.toLocaleString('ko-KR');
  };
  
  return (
    <>
      <ProgressBar currentStep={3} />
      <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-navy mb-2">급여를 설정해주세요</h1>
      <p className="text-gray-600 mb-8">강사근로계약서의 급여 방식을 선택하고 금액을 입력해주세요.</p>
      
      <div className="space-y-8">
        {/* 급여 방식 선택 */}
        <div className="mb-6">
          {showAllSalaryTypes ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                급여 방식을 선택해주세요
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="space-y-3">
                {/* 고정급 카드 */}
                <label className={`block p-5 border-2 rounded-lg cursor-pointer transition-all ${
                  salary.type === 'FIXED'
                    ? 'border-navy bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:shadow-sm'
                }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="salaryType"
                  value="FIXED"
                  checked={salary.type === 'FIXED'}
                  onChange={(e) => {
                    updateSalary({ type: 'FIXED' });
                    setFixedTotalInput(3000000);
                    if (fixedTotalInput === 0) {
                      setFixedTotalInput(3000000);
                    }
                    setShowAllSalaryTypes(false);
                  }}
                  className="w-5 h-5 text-navy border-gray-300 focus:ring-navy mt-1"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg text-gray-900">고정급 (월급제)</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">⭐ 가장 많이 사용</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">매월 고정된 금액을 지급합니다.</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✓</span>
                      <span>급여 예측이 쉬움</span>
                    </div>
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✓</span>
                      <span>행정 처리 간편</span>
                    </div>
                    <div className="flex items-center text-amber-700">
                      <span className="mr-2">⚠️</span>
                      <span>근무시간 변동 시 정산 필요</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>
            
            {/* 비율제 카드 */}
            <label className={`block p-5 border-2 rounded-lg cursor-pointer transition-all ${
              salary.type === 'PERCENTAGE'
                ? 'border-navy bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:shadow-sm'
            }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="salaryType"
                  value="PERCENTAGE"
                  checked={salary.type === 'PERCENTAGE'}
                  onChange={(e) => {
                    updateSalary({ 
                      type: 'PERCENTAGE',
                      mealAllowance: salary.mealAllowance || 200000,
                      transportAllowance: 0
                    });
                    setShowAllSalaryTypes(false);
                    // 비율제 선택 시 안내 팝업
                    setModalState({
                      isOpen: true,
                      type: 'info',
                      title: '비율제 급여 안내',
                      content: (
                        <div className="space-y-3">
                          <p>비율제(인센티브)를 선택하셨습니다.</p>
                          <div>
                            <p className="font-semibold mb-1">✅ 장점:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                              <li>강사 성과에 연동된 급여 지급</li>
                              <li>강사 동기부여 효과</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold mb-1">⚠️ 주의사항:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                              <li>인센티브가 최저임금에 미달하면 차액을 지급해야 함</li>
                              <li>매월 정산이 필요할 수 있음</li>
                            </ul>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            학온이 최저임금을 자동으로 계산하고 계약서에 최소 보장금액을 명시해드립니다.
                          </p>
                        </div>
                      ),
                      confirmText: '확인'
                    });
                  }}
                  className="w-5 h-5 text-navy border-gray-300 focus:ring-navy mt-1"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg text-gray-900">비율제 (인센티브)</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">💡 성과 연동</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">수강료의 일정 비율을 지급합니다.</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✓</span>
                      <span>성과에 따른 보상 가능</span>
                    </div>
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✓</span>
                      <span>강사 동기부여 효과</span>
                    </div>
                    <div className="flex items-center text-amber-700">
                      <span className="mr-2">⚠️</span>
                      <span>최저임금 보장 필수 (미달 시 차액 지급)</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>
            
            {/* 시급제 카드 */}
            <label className={`block p-5 border-2 rounded-lg cursor-pointer transition-all ${
              salary.type === 'HOURLY'
                ? 'border-navy bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:shadow-sm'
            }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="salaryType"
                  value="HOURLY"
                  checked={salary.type === 'HOURLY'}
                  onChange={(e) => {
                    updateSalary({ 
                      type: 'HOURLY',
                      hourlyWage: salary.hourlyWage || LEGAL_STANDARDS.MIN_HOURLY_WAGE,
                      mealAllowance: 0
                    });
                    setShowAllSalaryTypes(false);
                  }}
                  className="w-5 h-5 text-navy border-gray-300 focus:ring-navy mt-1"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg text-gray-900">시급제</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">📋 단시간 적합</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">근무한 시간에 따라 시급을 지급합니다.</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✓</span>
                      <span>근무시간 변동에 유연</span>
                    </div>
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✓</span>
                      <span>15시간 미만 단시간 근로에 적합</span>
                    </div>
                    <div className="flex items-center text-amber-700">
                      <span className="mr-2">⚠️</span>
                      <span>매월 급여가 달라질 수 있음</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>
              </div>
            </>
          ) : (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  선택된 급여 방식
                </label>
                <button
                  onClick={() => setShowAllSalaryTypes(true)}
                  className="text-sm text-navy hover:text-navy/80 underline"
                >
                  다른 방식 선택
                </button>
              </div>
              {/* 선택된 급여 방식 카드만 표시 */}
              {salary.type === 'FIXED' && (
                <label className="block p-5 border-2 border-navy bg-blue-50 shadow-md rounded-lg">
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="salaryType"
                      value="FIXED"
                      checked={true}
                      readOnly
                      className="w-5 h-5 text-navy border-gray-300 focus:ring-navy mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg text-gray-900">고정급 (월급제)</span>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">⭐ 가장 많이 사용</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">매월 고정된 금액을 지급합니다.</p>
                    </div>
                  </div>
                </label>
              )}
              {salary.type === 'PERCENTAGE' && (
                <label className="block p-5 border-2 border-navy bg-blue-50 shadow-md rounded-lg">
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="salaryType"
                      value="PERCENTAGE"
                      checked={true}
                      readOnly
                      className="w-5 h-5 text-navy border-gray-300 focus:ring-navy mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg text-gray-900">비율제 (인센티브)</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">💡 성과 연동</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">수강료의 일정 비율을 지급합니다.</p>
                    </div>
                  </div>
                </label>
              )}
              {salary.type === 'HOURLY' && (
                <label className="block p-5 border-2 border-navy bg-blue-50 shadow-md rounded-lg">
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="salaryType"
                      value="HOURLY"
                      checked={true}
                      readOnly
                      className="w-5 h-5 text-navy border-gray-300 focus:ring-navy mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg text-gray-900">시급제</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">📋 단시간 적합</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">근무한 시간에 따라 시급을 지급합니다.</p>
                    </div>
                  </div>
                </label>
              )}
            </div>
          )}
        </div>
        
        {/* 고정급 입력 - 총액 기반 역산 방식 */}
        {salary.type === 'FIXED' && (
          <div className="space-y-6">
            {/* 15시간 미만 안내 */}
            {weeklyHours < 15 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 font-medium">
                  💡 15시간 미만 단시간 근로자는 관리가 간편한 시급제를 권장합니다.
                </p>
              </div>
            )}

            {/* 학온 Tip */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">💡 학온 Tip</p>
              <p className="text-sm text-green-700 mt-1">
                식대와 자가운전보조금 비과세 한도(각 20만 원)를 활용하면 4대 보험료를 절감할 수 있습니다.
              </p>
            </div>

            {/* 총액 기반 역산 계산기 - 시급 기반 정산 */}
            {(() => {
              // STEP 1: 경업금지대가 제외 (근로의 대가가 아니므로 주휴수당 계산에서 제외)
              const nonCompeteAmount = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
              const split = calcFixedOrdinarySplit({
                totalMonthlyPay: fixedTotalInput,
                weeklyHours,
                weeklyHolidayHours,
                meal: salary.mealAllowance,
                transport: salary.transportAllowance,
                position: salary.positionAllowance,
                other: salary.otherAllowance,
                overtime: salary.overtimeAllowance,
                nonCompete: nonCompeteAmount,
              });
              const overtimePay = salary.overtimeAllowance || 0;
              const minWageHourlyRate = monthlyTotalHours > 0
                ? (fixedTotalInput - nonCompeteAmount - overtimePay) / monthlyTotalHours
                : 0;
              
              // 기본급/주휴수당/통상시급(주휴 산정 기준)
              const calculatedBaseSalary = split.baseSalary;
              const calculatedWeeklyHolidayPay = split.holidayPay;
              
              // 최저임금 검증
              const isUnderMinWage = minWageHourlyRate > 0 && minWageHourlyRate < LEGAL_STANDARDS.MIN_HOURLY_WAGE;

              // 역산 계산 함수 (총액 변경 시) - 시급 기반
              const recalculateFromTotal = (total: number, includeNonCompete: boolean, vehicleChecked: boolean) => {
                const newNonCompete = includeNonCompete ? Math.round(total * 0.1) : 0;
                const meal = 200000;
                const transport = 0; // 기본값: 자가운전보조금 미선택
                
                const split = calcFixedOrdinarySplit({
                  totalMonthlyPay: total,
                  weeklyHours,
                  weeklyHolidayHours,
                  meal,
                  transport,
                  position: salary.positionAllowance,
                  other: salary.otherAllowance,
                  overtime: salary.overtimeAllowance,
                  nonCompete: newNonCompete,
                });
                
                return {
                  baseSalary: split.baseSalary,
                  nonCompete: newNonCompete,
                  meal,
                  transport,
                  holidayPay: split.holidayPay,
                };
              };

              return (
                <>
                  {/* ① 총 지급 희망 금액 */}
                  <div className="bg-navy/5 p-4 rounded-lg border-2 border-navy">
                    <p className="text-sm font-bold text-navy mb-3">📋 ① 총 지급 희망 금액 입력</p>
                    <p className="text-xs text-gray-600 mb-3">강사에게 지급할 월 총 급여(세전)를 입력하세요.</p>
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumberInput(fixedTotalInput)}
                        onChange={(e) => {
                          const total = parseNumber(e.target.value);
                          setFixedTotalInput(total);
                          if (total > 0) {
                            const calc = recalculateFromTotal(total, protection.hasNonCompete, hasVehicle);
                            updateSalary({
                              baseSalary: calc.baseSalary > 0 ? calc.baseSalary : 0,
                              mealAllowance: calc.meal,
                              transportAllowance: calc.transport
                            });
                            if (protection.hasNonCompete) {
                              updateProtection({ nonCompeteCompensation: calc.nonCompete });
                            }
                          }
                        }}
                        placeholder="예: 3,000,000"
                        className="w-full px-4 py-4 pr-20 border-2 border-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-navy text-xl font-bold"
                      />
                      <span className="absolute right-4 top-4 text-gray-500 text-lg">원</span>
                    </div>
                    {fixedTotalInput > 0 && (
                      <p className="mt-2 text-lg text-navy font-bold">
                        ({numberToKorean(fixedTotalInput)}원)
                      </p>
                    )}
                    
                    {/* 최저임금 경고 */}
                    {isUnderMinWage && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">
                          ⚠️ 지급 총액이 최저임금 기준에 미달합니다. 금액을 높여주세요.<br/>
                          <span className="text-xs">계산된 시급 {formatCurrency(Math.round(minWageHourlyRate))}원이 최저시급 {formatCurrency(LEGAL_STANDARDS.MIN_HOURLY_WAGE)}원보다 낮습니다.<br/></span>
                          <span className="text-xs">월 환산 시간 {monthlyTotalHours.toFixed(2)}시간 기준</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ② 비과세 항목 설정 */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-navy mb-3">📋 ② 비과세 항목 설정</p>
                    
                    {/* 식대 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        식대
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">비과세 월 20만원 한도</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumberInput(salary.mealAllowance)}
                          onChange={(e) => {
                            const newMeal = parseNumber(e.target.value);
                          const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                          const { baseSalary } = calcFixedOrdinarySplit({
                            totalMonthlyPay: fixedTotalInput,
                            weeklyHours,
                            weeklyHolidayHours,
                            meal: newMeal,
                            transport: salary.transportAllowance,
                            position: salary.positionAllowance,
                            other: salary.otherAllowance,
                            overtime: salary.overtimeAllowance,
                            nonCompete,
                          });
                            updateSalary({ 
                              mealAllowance: newMeal,
                            baseSalary
                            });
                          }}
                          placeholder="200,000"
                          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                        />
                        <span className="absolute right-4 top-3 text-gray-500">원</span>
                      </div>
                      {salary.mealAllowance > 0 && (
                        <p className="mt-1 text-sm text-navy">({numberToKorean(salary.mealAllowance)}원)</p>
                      )}
                    </div>
                    
                    {/* 자가운전보조금 */}
                    <div>
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="hasVehicleFixed"
                          checked={hasVehicle}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setHasVehicle(checked);
                            const newTransport = checked ? 200000 : 0;
                            const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                            const { baseSalary } = calcFixedOrdinarySplit({
                              totalMonthlyPay: fixedTotalInput,
                              weeklyHours,
                              weeklyHolidayHours,
                              meal: salary.mealAllowance,
                              transport: newTransport,
                              position: salary.positionAllowance,
                              other: salary.otherAllowance,
                              overtime: salary.overtimeAllowance,
                              nonCompete,
                            });
                            updateSalary({ 
                              transportAllowance: newTransport,
                              baseSalary
                            });
                          }}
                          className="w-4 h-4 text-navy border-gray-300 rounded"
                        />
                        <label htmlFor="hasVehicleFixed" className="ml-2 text-sm font-medium text-gray-700">
                          자가운전보조금 추가 (선택사항)
                        </label>
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">비과세 월 20만원 한도</span>
                      </div>
                      {hasVehicle && (
                        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-800">
                            ⚠️ 본인 차량을 업무(출장/방문수업)에 이용하는 경우에만 비과세 적용됩니다
                          </p>
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumberInput(salary.transportAllowance)}
                          onChange={(e) => {
                            let newTransport = parseNumber(e.target.value);
                            // 최대 200,000원 제한
                            if (newTransport > 200000) {
                              newTransport = 200000;
                            }
                            const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                            const { baseSalary } = calcFixedOrdinarySplit({
                              totalMonthlyPay: fixedTotalInput,
                              weeklyHours,
                              weeklyHolidayHours,
                              meal: salary.mealAllowance,
                              transport: newTransport,
                              position: salary.positionAllowance,
                              other: salary.otherAllowance,
                              overtime: salary.overtimeAllowance,
                              nonCompete,
                            });
                            updateSalary({ 
                              transportAllowance: newTransport,
                              baseSalary
                            });
                          }}
                          placeholder="200,000"
                          disabled={!hasVehicle}
                          max={200000}
                          className={`w-full px-4 py-3 pr-20 border rounded-lg ${hasVehicle ? 'border-gray-300 bg-white' : 'bg-gray-100'}`}
                        />
                        <span className="absolute right-4 top-3 text-gray-500">원</span>
                      </div>
                      {salary.transportAllowance > 0 && (
                        <p className="mt-1 text-sm text-navy">({numberToKorean(salary.transportAllowance)}원)</p>
                      )}
                    </div>
                  </div>

                  {/* ③ 경업금지 약정 */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-navy mb-3">📋 ③ 경업금지 약정 설정</p>
                    
                    <div className="mb-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={protection.hasNonCompete}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const newNonCompete = checked ? Math.round(fixedTotalInput * 0.1) : 0;
                            updateProtection({ 
                              hasNonCompete: checked,
                              nonCompeteCompensation: newNonCompete
                            });
                            const { baseSalary } = calcFixedOrdinarySplit({
                              totalMonthlyPay: fixedTotalInput,
                              weeklyHours,
                              weeklyHolidayHours,
                              meal: salary.mealAllowance,
                              transport: salary.transportAllowance,
                              position: salary.positionAllowance,
                              other: salary.otherAllowance,
                              overtime: salary.overtimeAllowance,
                              nonCompete: newNonCompete,
                            });
                            updateSalary({ baseSalary });
                          }}
                          className="w-5 h-5 text-navy border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">퇴직 후 경업금지 약정 적용</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500">💡 학온 추천: 경업금지 대가는 총액의 10%를 권장합니다.</p>
                    </div>

                    {protection.hasNonCompete && (
                      <div className="space-y-3 p-3 bg-white rounded border border-gray-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">기간</label>
                            <select
                              value={protection.nonCompetePeriod}
                              onChange={(e) => updateProtection({ nonCompetePeriod: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <option key={m} value={m}>{m}개월</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">범위</label>
                            <select
                              value={protection.nonCompeteRadius}
                              onChange={(e) => updateProtection({ nonCompeteRadius: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              {[1,2,3,4,5].map(km => (
                                <option key={km} value={km}>반경 {km}km</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">경업금지 대가 (월)</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={formatNumberInput(protection.nonCompeteCompensation)}
                              onChange={(e) => {
                                const newNonCompete = parseNumber(e.target.value);
                                updateProtection({ nonCompeteCompensation: newNonCompete });
                              const { baseSalary } = calcFixedOrdinarySplit({
                                totalMonthlyPay: fixedTotalInput,
                                weeklyHours,
                                weeklyHolidayHours,
                                meal: salary.mealAllowance,
                                transport: salary.transportAllowance,
                                position: salary.positionAllowance,
                                other: salary.otherAllowance,
                                overtime: salary.overtimeAllowance,
                                nonCompete: newNonCompete,
                              });
                              updateSalary({ baseSalary });
                              }}
                              className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg text-sm"
                            />
                            <span className="absolute right-3 top-2 text-gray-500 text-sm">원</span>
                          </div>
                          {protection.nonCompeteCompensation > 0 && (
                            <p className="mt-1 text-sm text-navy">({numberToKorean(protection.nonCompeteCompensation)}원)</p>
                          )}
                          <p className="mt-1 text-xs text-blue-600">
                            💡 학온 추천: 총액 {formatCurrency(fixedTotalInput)}원의 10% = {formatCurrency(Math.round(fixedTotalInput * 0.1))}원을 경업금지 대가로 권장합니다.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 추가 수당 설정 */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-navy mb-3">📋 추가 수당 설정</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          연장근로수당
                          {overtimeRequired && (
                            <span className="ml-2 text-xs text-red-600">⚠️ 법정 근로시간(40시간) 초과로 연장근로수당이 자동 적용됩니다.</span>
                          )}
                        </label>
                        {overtimeRequired ? (
                          <>
                            <div className="relative">
                              <input
                                type="text"
                                value={formatNumberInput(minimumOvertimePay)}
                                readOnly
                                className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed"
                              />
                              <span className="absolute right-4 top-3 text-gray-500">원</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-600">
                              주 {overtimeWeeklyHours.toFixed(1)}시간 초과분 × 통상시급 × 1.5 × 4.345주 (자동 계산)
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="relative">
                              <input
                                type="text"
                                value={formatNumberInput(salary.overtimeAllowance)}
                                onChange={(e) => {
                                  const val = parseNumber(e.target.value);
                                  if (salary.type === 'FIXED') {
                                    const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                                    const { baseSalary } = calcFixedOrdinarySplit({
                                      totalMonthlyPay: fixedTotalInput,
                                      weeklyHours,
                                      weeklyHolidayHours,
                                      meal: salary.mealAllowance,
                                      transport: salary.transportAllowance,
                                      position: salary.positionAllowance,
                                      other: salary.otherAllowance,
                                      overtime: val,
                                      nonCompete,
                                    });
                                    updateSalary({ baseSalary, overtimeAllowance: val });
                                  } else {
                                    updateSalary({ overtimeAllowance: val });
                                  }
                                }}
                                placeholder="0"
                                className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                              />
                              <span className="absolute right-4 top-3 text-gray-500">원</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">주 40시간 이하인 경우 연장근로수당은 선택사항입니다.</p>
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">직책수당</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formatNumberInput(salary.positionAllowance)}
                            onChange={(e) => {
                              const val = parseNumber(e.target.value);
                              const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                              const { baseSalary } = calcFixedOrdinarySplit({
                                totalMonthlyPay: fixedTotalInput,
                                weeklyHours,
                                weeklyHolidayHours,
                                meal: salary.mealAllowance,
                                transport: salary.transportAllowance,
                                position: val,
                                other: salary.otherAllowance,
                                overtime: salary.overtimeAllowance,
                                nonCompete,
                              });
                              updateSalary({ baseSalary, positionAllowance: val });
                            }}
                            placeholder="0"
                            className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                          />
                          <span className="absolute right-4 top-3 text-gray-500">원</span>
                        </div>
                        {salary.positionAllowance > 0 && (
                          <p className="mt-1 text-sm text-navy">({numberToKorean(salary.positionAllowance)}원)</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">기타 수당</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formatNumberInput(salary.otherAllowance)}
                            onChange={(e) => {
                              const val = parseNumber(e.target.value);
                              const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                              const { baseSalary } = calcFixedOrdinarySplit({
                                totalMonthlyPay: fixedTotalInput,
                                weeklyHours,
                                weeklyHolidayHours,
                                meal: salary.mealAllowance,
                                transport: salary.transportAllowance,
                                position: salary.positionAllowance,
                                other: val,
                                overtime: salary.overtimeAllowance,
                                nonCompete,
                              });
                              updateSalary({ baseSalary, otherAllowance: val });
                            }}
                            placeholder="0"
                            className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                          />
                          <span className="absolute right-4 top-3 text-gray-500">원</span>
                        </div>
                        {salary.otherAllowance > 0 && (
                          <>
                            <p className="mt-1 text-sm text-navy">({numberToKorean(salary.otherAllowance)}원)</p>
                            <div className="mt-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                수당 명칭/설명 <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={salary.otherAllowanceMemo || ''}
                                onChange={(e) => updateSalary({ otherAllowanceMemo: e.target.value })}
                                placeholder="예: 교재연구비, 성과급 등"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              {!salary.otherAllowanceMemo && (
                                <p className="mt-1 text-xs text-red-500">⚠️ 기타 수당 입력 시 명칭/설명은 필수입니다.</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ④ 최종 계산 결과 */}
                  <div className="bg-navy/5 p-4 rounded-lg border-2 border-navy/20">
                    <p className="text-sm font-bold text-navy mb-3">📋 ④ 최종 계산 결과</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="font-medium">기본급</span>
                        <span className="font-bold text-navy">{formatCurrency(calculatedBaseSalary)}원</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-medium">주휴수당</span>
                        <span className="font-bold text-navy">{formatCurrency(calculatedWeeklyHolidayPay)}원</span>
                      </div>
                      <div className="text-xs text-gray-500 pl-2">
                        <div>통상시급(주휴 산정 기준): {formatCurrency(Math.round(split.ordinaryHourly))}원 × {split.mh.toFixed(2)}시간</div>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>식대 <span className="text-green-600">(비과세)</span></span>
                        <span>{formatCurrency(salary.mealAllowance)}원</span>
                      </div>
                      {hasVehicle && salary.transportAllowance > 0 && (
                        <div className="flex justify-between py-1">
                          <span>자가운전보조금 <span className="text-green-600">(비과세)</span></span>
                          <span>{formatCurrency(salary.transportAllowance)}원</span>
                        </div>
                      )}
                      {salary.positionAllowance > 0 && (
                        <div className="flex justify-between py-1">
                          <span>직책수당</span>
                          <span>{formatCurrency(salary.positionAllowance)}원</span>
                        </div>
                      )}
                      {salary.overtimeAllowance > 0 && (
                        <div className="flex justify-between py-1 text-red-700">
                          <span>연장근로수당</span>
                          <span>{formatCurrency(salary.overtimeAllowance)}원</span>
                        </div>
                      )}
                      {salary.otherAllowance > 0 && (
                        <div className="flex justify-between py-1">
                          <span>기타수당</span>
                          <span>{formatCurrency(salary.otherAllowance)}원</span>
                        </div>
                      )}
                      {protection.hasNonCompete && (
                        <div className="flex justify-between py-1 text-amber-700">
                          <span>경업금지약정대가</span>
                          <span>{formatCurrency(protection.nonCompeteCompensation)}원</span>
                        </div>
                      )}
                      
                      <div className="border-t-2 border-navy/20 pt-3 mt-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span className="text-navy">💰 월 총 지급액</span>
                          <span className="text-navy">{formatCurrency(fixedTotalInput)}원</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 최저임금 검증 정보 */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">
                        📌 {LEGAL_STANDARDS.YEAR}년 최저임금 기준: {formatCurrency(minWageTotal)}원 (주 {weeklyHours}시간 기준)<br/>
                        📌 계산된 시급: {formatCurrency(Math.round(minWageHourlyRate))}원 {!isUnderMinWage ? '✅ 최저시급 이상' : ('⚠️ 최저시급(' + formatCurrency(LEGAL_STANDARDS.MIN_HOURLY_WAGE) + '원) 미달')}<br/>
                        📌 계산 근거: (총액 - 경업대가 - 연장수당) ÷ 월 환산 시간(최대 209h)<br/>
                        📌 연장근로 {overtimeWeeklyHours.toFixed(1)}시간에 대한 수당 {formatCurrency(salary.overtimeAllowance || 0)}원 제외
                      </p>
                    </div>
                    
                    {/* 학온 팁 */}
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-800">
                        💡 <strong>학온 팁:</strong> 원장님이 설정하신 총액 내에서 식대를 분리하여 세금을 아끼고, 주휴수당을 넉넉히 배분하여 임금체불 리스크를 방어했습니다.
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
        
        {/* 비율제 입력 */}
        {salary.type === 'PERCENTAGE' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">💡 학온 Tip</p>
              <p className="text-sm text-green-700 mt-1">
                식대와 자가운전보조금 비과세 한도(각 20만 원)를 활용하면 4대 보험료를 절감할 수 있습니다.
              </p>
            </div>

            {/* 매출 비율 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                강사료 산정의 기준이 되는 매출액의 몇 %를 지급하시나요?
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={salary.revenueRatio || 50}
                  onChange={(e) => updateSalary({ revenueRatio: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-navy"
                />
                <span className="text-lg font-semibold text-navy min-w-[60px]">{salary.revenueRatio || 50}%</span>
              </div>
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-gray-700">
                  💡 학온 Tip: 일반적으로 부가가치세나 교재비 등을 제외한 순매출액을 기준으로 합니다.
                </p>
              </div>
            </div>

            {/* 비과세 항목 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-navy mb-3">📋 비과세 항목 설정</p>
              
              {/* 식대 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  식대
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">비과세</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumberInput(salary.mealAllowance)}
                    onChange={(e) => {
                      const newMeal = parseNumber(e.target.value);
                      const newTaxFree = newMeal + salary.transportAllowance;
                      const newBaseSalary = Math.round((minWageTotalForPercentage - newTaxFree - fixedAllowancesForGuarantee) / 1.2);
                      updateSalary({ 
                        mealAllowance: newMeal,
                        percentageBaseSalary: newBaseSalary > 0 ? newBaseSalary : 0
                      });
                    }}
                    placeholder="200,000"
                    className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                  />
                  <span className="absolute right-4 top-3 text-gray-500">원</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">월 20만원 한도</p>
              </div>

              {/* 자가운전보조금 */}
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="hasVehiclePercentage"
                    checked={hasVehicle}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasVehicle(checked);
                      const newTransport = checked ? 200000 : 0;
                      // 비과세 변경 시 기본급 자동 재계산
                      const newTaxFree = salary.mealAllowance + newTransport;
                      const newBaseSalary = Math.round((minWageTotalForPercentage - newTaxFree - fixedAllowancesForGuarantee) / 1.2);
                      updateSalary({ 
                        transportAllowance: newTransport,
                        percentageBaseSalary: newBaseSalary > 0 ? newBaseSalary : 0
                      });
                    }}
                    className="w-4 h-4 text-navy border-gray-300 rounded focus:ring-navy"
                  />
                  <label htmlFor="hasVehiclePercentage" className="ml-2 text-sm font-medium text-gray-700">
                    자가운전보조금 추가 (선택사항)
                  </label>
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">비과세 월 20만원 한도</span>
                </div>
                {hasVehicle && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      ⚠️ 본인 차량을 업무(출장/방문수업)에 이용하는 경우에만 비과세 적용됩니다
                    </p>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumberInput(salary.transportAllowance)}
                    onChange={(e) => {
                      let newTransport = parseNumber(e.target.value);
                      // 최대 200,000원 제한
                      if (newTransport > 200000) {
                        newTransport = 200000;
                      }
                      const newTaxFree = salary.mealAllowance + newTransport;
                      const newBaseSalary = Math.round((minWageTotalForPercentage - newTaxFree - fixedAllowancesForGuarantee) / 1.2);
                      updateSalary({ 
                        transportAllowance: newTransport,
                        percentageBaseSalary: newBaseSalary > 0 ? newBaseSalary : 0
                      });
                    }}
                    placeholder="200,000"
                    disabled={!hasVehicle}
                    max={200000}
                    className={`w-full px-4 py-3 pr-20 border rounded-lg ${hasVehicle ? 'border-gray-300 bg-white' : 'bg-gray-100'}`}
                  />
                  <span className="absolute right-4 top-3 text-gray-500">원</span>
                </div>
              </div>
            </div>

            {/* 최저임금 적용 */}
            {(() => {
              const taxFreeAmount = salary.mealAllowance + salary.transportAllowance;
              const calculatedBaseSalary = Math.round((minWageTotalForPercentage - taxFreeAmount - fixedAllowancesForGuarantee) / 1.2);
              const calculatedWeeklyPay = Math.round(calculatedBaseSalary * 0.2);
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-navy mb-3">📋 최저임금 기준 자동 설정</p>
                  <div className="text-sm text-blue-700 mb-2 p-2 bg-blue-100 rounded">
                    <p className="font-medium mb-1">📌 최저임금 계산 ({LEGAL_STANDARDS.YEAR}년 기준: {formatCurrency(LEGAL_STANDARDS.MIN_HOURLY_WAGE)}원/시간)</p>
                    <p className="text-xs">
                      • 주 유급시간(소정+주휴): {weeklyPaidHours.toFixed(1)}시간<br/>
                      • 월 유급시간(소정+주휴): {monthlyPaidHours.toFixed(2)}시간<br/>
                      • 최저월급(유급시간 기준): <span className="font-bold">{formatCurrency(minWageTotalForPercentage)}원</span><br/>
                      • 연장근로수당은 별도(추가 수당 설정)에서 계산됩니다.<br/>
                      • 별도 지급 항목 포함 시 실제 지급액은 더 커질 수 있습니다.
                    </p>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    💰 현재 비과세: 식대 {formatCurrency(salary.mealAllowance)}원 {hasVehicle && salary.transportAllowance > 0 && ('+ 자가운전보조금 ' + formatCurrency(salary.transportAllowance) + '원')} = <span className="font-bold">{formatCurrency(taxFreeAmount)}원</span>
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const newTaxFree = 200000 + (hasVehicle ? 200000 : 0);
                      const newBase = Math.round((minWageTotalForPercentage - newTaxFree - fixedAllowancesForGuarantee) / 1.2);
                      updateSalary({ 
                        percentageBaseSalary: newBase > 0 ? newBase : 0,
                        mealAllowance: 200000,
                        transportAllowance: hasVehicle ? 200000 : 0
                      });
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                  >
                    🎯 최저임금 적용 (기본급 {formatCurrency(calculatedBaseSalary)}원 + 주휴수당 {formatCurrency(calculatedWeeklyPay)}원)
                  </button>
                </div>
              );
            })()}

            {/* 기본급 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-navy mb-3">📋 기본급 확인/조정</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">기본급 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumberInput(salary.percentageBaseSalary || 0)}
                    onChange={(e) => updateSalary({ percentageBaseSalary: parseNumber(e.target.value) })}
                    placeholder="1,200,000"
                    className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg bg-white"
                  />
                  <span className="absolute right-4 top-3 text-gray-500">원</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">주휴수당 (자동 계산)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumberInput(Math.round((salary.percentageBaseSalary || 0) * 0.2))}
                    readOnly
                    className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-lg bg-gray-100"
                  />
                  <span className="absolute right-4 top-3 text-gray-500">원</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  계산 근거: 주휴시간(주 8시간) 기준 자동 산정
                </p>
              </div>
            </div>

            {/* 추가 수당 설정 */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-navy mb-3">📋 추가 수당 설정</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    연장근로수당
                    {overtimeRequired && (
                      <span className="ml-2 text-xs text-red-600">⚠️ 법정 근로시간(40시간) 초과로 연장근로수당이 자동 적용됩니다.</span>
                    )}
                  </label>
                  {overtimeRequired ? (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumberInput(minimumOvertimePay)}
                          readOnly
                          className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                        <span className="absolute right-4 top-3 text-gray-500">원</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        주 {overtimeWeeklyHours.toFixed(1)}시간 초과분 × 통상시급 × 1.5 × 4.345주 (자동 계산)
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatNumberInput(salary.overtimeAllowance)}
                          onChange={(e) => updateSalary({ overtimeAllowance: parseNumber(e.target.value) })}
                          placeholder="0"
                          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                        />
                        <span className="absolute right-4 top-3 text-gray-500">원</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">주 40시간 이하인 경우 연장근로수당은 선택사항입니다.</p>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">직책수당</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumberInput(salary.positionAllowance)}
                      onChange={(e) => {
                        const val = parseNumber(e.target.value);
                        updateSalary({ positionAllowance: val });
                      }}
                      placeholder="0"
                      className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                    />
                    <span className="absolute right-4 top-3 text-gray-500">원</span>
                  </div>
                  {salary.positionAllowance > 0 && (
                    <p className="mt-1 text-sm text-navy">({numberToKorean(salary.positionAllowance)}원)</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">기타 수당</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumberInput(salary.otherAllowance)}
                      onChange={(e) => {
                        const val = parseNumber(e.target.value);
                        updateSalary({ otherAllowance: val });
                      }}
                      placeholder="0"
                      className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                    />
                    <span className="absolute right-4 top-3 text-gray-500">원</span>
                  </div>
                  {salary.otherAllowance > 0 && (
                    <>
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          수당 명칭 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={salary.otherAllowanceMemo || ''}
                          onChange={(e) => updateSalary({ otherAllowanceMemo: e.target.value })}
                          placeholder="예: 교재연구비, 성과급 등"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <p className="mt-1 text-xs text-red-600">⚠️ 기타 수당 입력 시 명칭 입력은 필수입니다</p>
                    </>
                  )}
                  {salary.otherAllowance > 0 && (
                    <p className="mt-1 text-sm text-navy">({numberToKorean(salary.otherAllowance)}원)</p>
                  )}
                </div>
              </div>
            </div>

            {/* 경업금지 약정 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-navy mb-3">📋 경업금지 약정 설정</p>
              
              <div className="mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={protection.hasNonCompete}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const calculatedWeeklyPay = Math.round((salary.percentageBaseSalary || 0) * 0.2);
                      // 최소보장금액 = 기본급 + 주휴수당 + 식대만
                      const minGuarantee =
                        (salary.percentageBaseSalary || 0) +
                        calculatedWeeklyPay +
                        salary.mealAllowance +
                        (salary.overtimeAllowance || 0);
                      // 최소보장금의 10%를 계산하고 10만원 단위로 반올림
                      const calculatedAmount = minGuarantee * 0.1;
                      const newNonCompete = checked ? Math.round(Math.round(calculatedAmount) / 100000) * 100000 : 0;
                      updateProtection({ 
                        hasNonCompete: checked,
                        nonCompeteCompensation: newNonCompete
                      });
                      if (checked && !hasShownNonCompeteNotice) {
                        setModalState({
                          isOpen: true,
                          type: 'warning',
                          title: '경업금지 대가 안내',
                          content: (
                            <div className="text-sm text-red-600">
                              비율제라도 경업금지대가는 <strong>별도 지급</strong> 항목입니다.
                            </div>
                          ),
                          confirmText: '확인',
                        });
                        setHasShownNonCompeteNotice(true);
                      }
                    }}
                    className="w-5 h-5 text-navy border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">퇴직 후 경업금지 약정 적용</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">💡 학온 추천: 경업금지 대가는 최소 보장 금액의 약 10%를 권장합니다.</p>
              </div>

              {protection.hasNonCompete && (
                <div className="space-y-3 p-3 bg-white rounded border border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">기간</label>
                      <select
                        value={protection.nonCompetePeriod}
                        onChange={(e) => updateProtection({ nonCompetePeriod: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <option key={m} value={m}>{m}개월</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">범위</label>
                      <select
                        value={protection.nonCompeteRadius}
                        onChange={(e) => updateProtection({ nonCompeteRadius: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {[1,2,3,4,5].map(km => (
                          <option key={km} value={km}>반경 {km}km</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">경업금지 대가 (월)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumberInput(protection.nonCompeteCompensation)}
                        onChange={(e) => {
                          const newNonCompete = parseNumber(e.target.value);
                          updateProtection({ nonCompeteCompensation: newNonCompete });
                        }}
                        className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg text-sm"
                      />
                      <span className="absolute right-3 top-2 text-gray-500 text-sm">원</span>
                    </div>
                    {protection.nonCompeteCompensation > 0 && (
                      <p className="mt-1 text-sm text-navy">({numberToKorean(protection.nonCompeteCompensation)}원)</p>
                    )}
                    {(() => {
                      const calculatedWeeklyPay = Math.round((salary.percentageBaseSalary || 0) * 0.2);
                      // 최소보장금액 = 기본급 + 주휴수당 + 식대만
                      const minGuarantee =
                        (salary.percentageBaseSalary || 0) +
                        calculatedWeeklyPay +
                        salary.mealAllowance +
                        (salary.overtimeAllowance || 0);
                      // 최소보장금의 10%를 계산하고 10만원 단위로 반올림
                      const calculatedAmount = minGuarantee * 0.1;
                      const recommendedAmount = Math.round(Math.round(calculatedAmount) / 100000) * 100000;
                      return (
                        <p className="mt-1 text-xs text-blue-600">
                          💡 학온 추천: 최소 보장 금액 {formatCurrency(minGuarantee)}원의 약 10% = {formatCurrency(recommendedAmount)}원을 경업금지 대가로 권장합니다.
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* 비율제 급여 지급 방식 안내 박스 */}
            {(() => {
              const calculatedWeeklyPay = Math.round((salary.percentageBaseSalary || 0) * 0.2);
              // 최소보장금액 = 기본급 + 주휴수당 + 식대 + 자가운전보조금 (+ 고정 수당 선택 시 포함)
              const 최소보장금액 =
                (salary.percentageBaseSalary || 0) +
                calculatedWeeklyPay +
                salary.mealAllowance +
                salary.transportAllowance +
                fixedAllowancesForGuarantee +
                (salary.overtimeAllowance || 0);
              
              return (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg mb-4">
                  <p className="text-sm font-bold text-blue-900 mb-3">📌 비율제 급여 지급 방식</p>
                  
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="flex-1 px-4 py-3 bg-white rounded-lg border border-blue-300 text-center shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">매출 기준</p>
                      <p className="font-bold text-blue-800">매출 × {salary.revenueRatio}%</p>
                    </div>
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">VS</span>
                    </div>
                    <div className="flex-1 px-4 py-3 bg-white rounded-lg border border-blue-300 text-center shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">최소 보장</p>
                      <p className="font-bold text-blue-800">{formatCurrency(최소보장금액)}원</p>
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-900 font-semibold">
                      👉 매월 <span className="text-blue-700 underline">둘 중 큰 금액</span>을 지급합니다 (+ 별도 지급 항목)
                    </p>
                  </div>
                  
                  <div className="mt-3 p-3 bg-white/70 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>💡 왜 이렇게 설계되었나요?</strong><br/>
                      <span className="text-gray-700">
                        • <strong>최저임금법 준수</strong>: 매출이 적은 달에도 최저임금 이상을 보장합니다.<br/>
                        • <strong>포괄임금 무효 리스크 방지</strong>: 주휴수당을 확정 급여 기준으로 정산하여 
                        임금체불 분쟁을 예방합니다.
                      </span>
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-3">
              <div className="text-sm text-navy font-medium">
                고정 수당(직책/기타)을 최저임금 보장액에 포함
                <div className="text-xs text-gray-600 mt-1">
                  * 정기·일률·고정 지급 수당이면 최저임금 산입 및 통상임금 포함 가능성이 높습니다.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIncludeFixedAllowancesInGuarantee((v) => !v)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  includeFixedAllowancesInGuarantee ? 'bg-navy text-white' : 'bg-white border border-gray-300 text-gray-700'
                }`}
              >
                {includeFixedAllowancesInGuarantee ? '포함' : '별도'}
              </button>
            </div>

            {/* 최소 보장 금액 상세 */}
            {(() => {
              const 주휴수당 = Math.round((salary.percentageBaseSalary || 0) * 0.2);
              // 최소보장금액 = 기본급 + 주휴수당 + 식대 + 자가운전보조금 (+ 고정 수당 선택 시 포함)
              const 최소보장금액 =
                (salary.percentageBaseSalary || 0) +
                주휴수당 +
                salary.mealAllowance +
                salary.transportAllowance +
                fixedAllowancesForGuarantee +
                (salary.overtimeAllowance || 0);
              
              return (
                <div className="bg-navy/5 p-4 rounded-lg border-2 border-navy/20">
                  <label className="block text-sm font-bold text-navy mb-2">🛡️ 최소 보장 금액 (매출 부진 시 지급 보장)</label>
                  
                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex justify-between">
                      <span>기본급</span>
                      <span>{formatCurrency(salary.percentageBaseSalary || 0)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span>주휴수당</span>
                      <span>{formatCurrency(주휴수당)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span>식대</span>
                      <span>{formatCurrency(salary.mealAllowance)}원</span>
                    </div>
                    {salary.transportAllowance > 0 && (
                      <div className="flex justify-between">
                        <span>자가운전보조금</span>
                        <span>{formatCurrency(salary.transportAllowance)}원</span>
                      </div>
                    )}
                    {(salary.overtimeAllowance || 0) > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-red-600">연장근로수당</span>
                        <span className="text-red-600">{formatCurrency(salary.overtimeAllowance)}원</span>
                      </div>
                    )}
                    {includeFixedAllowancesInGuarantee && salary.positionAllowance > 0 && (
                      <div className="flex justify-between">
                        <span>직책수당</span>
                        <span>{formatCurrency(salary.positionAllowance)}원</span>
                      </div>
                    )}
                    {includeFixedAllowancesInGuarantee && salary.otherAllowance > 0 && (
                      <div className="flex justify-between">
                        <span>기타수당 {salary.otherAllowanceMemo && `(${salary.otherAllowanceMemo})`}</span>
                        <span>{formatCurrency(salary.otherAllowance)}원</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-navy/20 pt-2">
                    <div className="flex justify-between font-bold text-navy text-lg">
                      <span>최소 보장 금액</span>
                      <span>{formatCurrency(최소보장금액)}원</span>
                    </div>
                  </div>
                  
                  <p className="mt-2 text-xs text-gray-600">
                    ※ 최저임금 합계액: {formatCurrency(minWageTotalForPercentage)}원
                    {최소보장금액 >= minWageTotalForPercentage ? ' ✅ 적법' : ' ⚠️ 미달'}
                  </p>
                </div>
              );
            })()}

            {/* 별도 지급 항목 */}
            {(() => {
              const showPositionAllowance = !includeFixedAllowancesInGuarantee && salary.positionAllowance > 0;
              const showOtherAllowance = !includeFixedAllowancesInGuarantee && salary.otherAllowance > 0;
              const showNonCompete = protection.hasNonCompete && protection.nonCompeteCompensation > 0;
              const 별도지급소계 =
                (showPositionAllowance ? salary.positionAllowance : 0) +
                (showOtherAllowance ? salary.otherAllowance : 0) +
                (showNonCompete ? protection.nonCompeteCompensation : 0);
              
              if (showPositionAllowance || showOtherAllowance || showNonCompete) {
                return (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">📋 별도 지급 항목</label>
                    <p className="text-xs text-gray-500 mb-3">매월 별도 지급 항목(일부는 고정 지급 시 최저임금 산입 가능)</p>
                    
                    <div className="space-y-1 text-sm">
                      {showPositionAllowance && (
                        <div className="flex justify-between">
                          <span>직책수당</span>
                          <span>{formatCurrency(salary.positionAllowance)}원</span>
                        </div>
                      )}
                      {showOtherAllowance && (
                        <div className="flex justify-between">
                          <span>기타수당 {salary.otherAllowanceMemo && `(${salary.otherAllowanceMemo})`}</span>
                          <span>{formatCurrency(salary.otherAllowance)}원</span>
                        </div>
                      )}
                      {showNonCompete && (
                        <div className="flex justify-between text-red-600 font-semibold">
                          <span>경업금지대가</span>
                          <span>{formatCurrency(protection.nonCompeteCompensation)}원</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between font-semibold text-gray-700">
                        <span>별도 지급 소계</span>
                        <span>{formatCurrency(별도지급소계)}원</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* 월 예상 총 지급액 */}
            {(() => {
              const 주휴수당 = Math.round((salary.percentageBaseSalary || 0) * 0.2);
              const 최소보장금액 =
                (salary.percentageBaseSalary || 0) +
                주휴수당 +
                salary.mealAllowance +
                salary.transportAllowance +
                fixedAllowancesForGuarantee +
                (salary.overtimeAllowance || 0);
              const 별도지급소계 =
                (includeFixedAllowancesInGuarantee ? 0 : salary.positionAllowance) +
                (includeFixedAllowancesInGuarantee ? 0 : salary.otherAllowance) +
                (protection.hasNonCompete ? protection.nonCompeteCompensation : 0);
              const 총지급액 = 최소보장금액 + 별도지급소계;
              
              return (
                <div className="bg-gradient-to-r from-navy/10 to-blue-100 p-4 rounded-lg border-2 border-navy/30 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-navy">💰 월 예상 총 지급액 (세전)</span>
                    <span className="font-bold text-navy text-2xl">{formatCurrency(총지급액)}원</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-right">
                    최소 보장 금액 + 별도 지급 항목
                  </p>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* 시급제 입력 */}
        {salary.type === 'HOURLY' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium">💡 학온 Tip</p>
              <p className="text-sm text-amber-700 mt-1">
                15시간 미만 단시간 근로자(알바)의 경우 시급제 방식을 권장합니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기본 시급 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumberInput(salary.hourlyWage)}
                  onChange={(e) => updateSalary({ hourlyWage: parseNumber(e.target.value) })}
                  placeholder="10,030"
                  className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg"
                />
                <span className="absolute right-4 top-3 text-gray-500">원</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                📌 {LEGAL_STANDARDS.YEAR}년 최저시급: {formatCurrency(LEGAL_STANDARDS.MIN_HOURLY_WAGE)}원
              </p>
              {salary.hourlyWage > 0 && salary.hourlyWage < LEGAL_STANDARDS.MIN_HOURLY_WAGE && (
                <p className="mt-1 text-sm text-red-600 font-medium">⚠️ 최저임금 미달</p>
              )}
            </div>

            {/* 비과세 항목 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-navy mb-3">📋 비과세 항목 설정</p>
              
              {/* 식대 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  식대
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">비과세 월 20만원 한도</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value="0"
                    readOnly
                    disabled
                    className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                  <span className="absolute right-4 top-3 text-gray-500">원</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">시급제는 식대를 지급하지 않는 경우가 많아 기본값을 0원으로 설정했습니다.</p>
              </div>

              {/* 자가운전보조금 */}
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="hasVehicleHourly"
                    checked={hasVehicle}
                    onChange={(e) => {
                      setHasVehicle(e.target.checked);
                      updateSalary({ transportAllowance: e.target.checked ? 200000 : 0 });
                    }}
                    className="w-4 h-4 text-navy border-gray-300 rounded"
                  />
                  <label htmlFor="hasVehicleHourly" className="ml-2 text-sm font-medium text-gray-700">
                    자가운전보조금 추가 (선택사항)
                  </label>
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">비과세 월 20만원 한도</span>
                </div>
                {hasVehicle && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      ⚠️ 본인 차량을 업무(출장/방문수업)에 이용하는 경우에만 비과세 적용됩니다
                    </p>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumberInput(salary.transportAllowance)}
                    onChange={(e) => {
                      let newTransport = parseNumber(e.target.value);
                      // 최대 200,000원 제한
                      if (newTransport > 200000) {
                        newTransport = 200000;
                      }
                      updateSalary({ transportAllowance: newTransport });
                    }}
                    placeholder="200,000"
                    disabled={!hasVehicle}
                    max={200000}
                    className={`w-full px-4 py-3 pr-20 border rounded-lg ${hasVehicle ? 'border-gray-300' : 'bg-gray-100'}`}
                  />
                  <span className="absolute right-4 top-3 text-gray-500">원</span>
                </div>
              </div>
            </div>

            {/* 예상 월 급여 */}
            {(() => {
              const monthlyBaseWage = Math.round(salary.hourlyWage * weeklyHours * 4.345);
              const holidayPay = weeklyHours >= 15 ? Math.round(salary.hourlyWage * weeklyHolidayHours * 4.345) : 0;
              const totalMonthly = monthlyBaseWage + holidayPay + salary.mealAllowance + salary.transportAllowance + salary.positionAllowance + salary.otherAllowance;
              
              return (
                <div className="bg-navy/5 p-4 rounded-lg border-2 border-navy/20">
                  <label className="block text-sm font-bold text-navy mb-2">💰 예상 월 지급액</label>
                  <div className="text-2xl font-bold text-navy mb-2">{formatCurrency(totalMonthly)}원</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>기본급 ({formatCurrency(salary.hourlyWage)}원 × {weeklyHours}시간 × 4.345주)</span>
                      <span>{formatCurrency(monthlyBaseWage)}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        주휴수당 
                        {weeklyHours >= 15 
                          ? ` (${formatCurrency(salary.hourlyWage)}원 × ${weeklyHolidayHours.toFixed(1)}시간 × 4.345주)`
                          : ' (15시간 미만 해당없음)'
                        }
                      </span>
                      <span>{formatCurrency(holidayPay)}원</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* 급여일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            급여일은 매월 며칠인가요? <span className="text-red-500">*</span>
          </label>
          <select
            value={salary.payDay || 10}
            onChange={(e) => updateSalary({ payDay: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>{day}일</option>
            ))}
          </select>
        </div>
      </div>
      
      <NavigationButtons
        onPrevious={handlePrevious}
        onNext={handleNext}
        canGoNext={canGoNext}
        nextLabel="다음"
        previousLabel="이전"
      />

      {/* 급여 설정 관련 모달 */}
      {modalState && (
        <SalaryModal
          isOpen={modalState.isOpen}
          onClose={() => {
            if (modalState) {
              setModalState({ ...modalState, isOpen: false });
            }
          }}
          onConfirm={modalState.onConfirm}
          type={modalState.type}
          title={modalState.title}
          content={modalState.content}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          showCancel={modalState.showCancel}
        />
      )}
      </div>
    </>
  );
}