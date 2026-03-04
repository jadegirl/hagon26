'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';
import ContractPeriodModal from '@/components/wizard/ContractPeriodModal';
import { useState, useMemo, useRef, useEffect } from 'react';
import { LEGAL_STANDARDS } from '@/constants/legalStandards';

// ===== 근무시간 상수 (step-5 원본) =====
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// 30분 단위 시간 옵션 (06:00 ~ 24:00)
const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30', '24:00'
];

// 시간을 분으로 변환
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 분을 시간 문자열로 변환
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// 법정 최소 휴게시간(분) 계산
const getMinimumBreakMinutes = (totalHours: number): number => {
  if (totalHours < 4) return 0;
  if (totalHours < 8) return 30;
  return 60;
};

// 프리셋 정의
const PRESETS = {
  week5: {
    name: '주 5일',
    description: '월금',
    days: [true, true, true, true, true, false, false],
    startTime: '14:00',
    endTime: '22:00',
    breakTime: 60,
    weeklyHours: 35
  },
  week3: {
    name: '주 3일',
    description: '월수금',
    days: [true, false, true, false, true, false, false],
    startTime: '14:00',
    endTime: '22:00',
    breakTime: 60,
    weeklyHours: 21
  },
  custom: {
    name: '직접 설정',
    description: '',
    days: [false, false, false, false, false, false, false],
    startTime: '14:00',
    endTime: '22:00',
    breakTime: 60,
    weeklyHours: 0
  }
};

export default function Step2Page() {
  const router = useRouter();
  const { contractPeriod, updateContractPeriod, workCondition, updateWorkCondition, recalculate } = useWizardStore();

  // ===== 섹션 A: 계약 기간 상태 (step-4 원본) =====
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'warning' | 'info';
    title: string;
    content: React.ReactNode;
    buttonText: string;
  } | null>(null);
  
  // 세션당 1회만 표시하기 위한 ref
  const shownModalsRef = useRef<Set<string>>(new Set());
  const prevContractDurationRef = useRef<number | null>(null);

  // 계약 기간 옵션 (개월 단위)
  const contractDurationOptions = [
    { value: 1, label: '1개월' },
    { value: 3, label: '3개월' },
    { value: 6, label: '6개월' },
    { value: 12, label: '1년' },
    { value: 24, label: '2년' },
    { value: 0, label: '직접 입력' }
  ];

  // 시작일과 기간이 변경되면 종료일 자동 계산 (초일 산입 방식)
  useEffect(() => {
    if (contractPeriod.startDate && contractPeriod.durationMonths && contractPeriod.durationMonths > 0) {
      const startDate = new Date(contractPeriod.startDate);
      const endDate = new Date(startDate);
      
      // 개월 수를 더하고, 그 다음 날짜에서 하루를 빼서 초일 산입 방식으로 계산
      // 예: 2025-12-18부터 12개월 = 2026-12-18, 종료일은 2026-12-17 (365일)
      endDate.setMonth(endDate.getMonth() + contractPeriod.durationMonths);
      endDate.setDate(endDate.getDate() - 1);
      
      const formattedEndDate = endDate.toISOString().split('T')[0];
      if (contractPeriod.endDate !== formattedEndDate) {
        updateContractPeriod({ endDate: formattedEndDate });
      }
    }
  }, [contractPeriod.startDate, contractPeriod.durationMonths, contractPeriod.endDate, updateContractPeriod]);

  // 계약기간 계산 (일 단위, 초일 산입)
  const contractDuration = useMemo(() => {
    if (!contractPeriod.startDate || !contractPeriod.endDate) return null;
    const start = new Date(contractPeriod.startDate);
    const end = new Date(contractPeriod.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // 초일 산입: 시작일과 종료일 모두 포함하므로 +1
    // 예: 2025.12.18 ~ 2026.12.17 = 365일 (1년)
    return diffDays + 1;
  }, [contractPeriod.startDate, contractPeriod.endDate]);

  // 1년 미만/이상 판단 (365일 기준)
  const isLessThanOneYear = contractDuration !== null && contractDuration < 365;
  const isOneYearOrMore = contractDuration !== null && contractDuration >= 365;
  const isMoreThanTwoYears = contractDuration !== null && contractDuration > 730; // 2년 = 730일

  // 계약기간 변경 시 팝업 표시
  useEffect(() => {
    if (contractDuration === null) return;
    
    // 이전 값과 같으면 팝업 표시 안 함
    if (prevContractDurationRef.current === contractDuration) return;
    prevContractDurationRef.current = contractDuration;

    // 조건 1: 1년 미만
    if (isLessThanOneYear && !shownModalsRef.current.has('lessThanOneYear')) {
      shownModalsRef.current.add('lessThanOneYear');
      setModalState({
        isOpen: true,
        type: 'warning',
        title: '퇴직금 회피 의혹 주의',
        content: (
          <div className="space-y-2">
            <p>계약기간을 1년 미만으로 설정하면 퇴직금 지급 의무가 없습니다.</p>
            <p className="font-semibold">단, 1년 미만 계약을 반복 갱신하는 경우:</p>
            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
              <li>퇴직금 회피 목적으로 간주되어 퇴직금 지급 의무가 발생할 수 있습니다</li>
              <li>2년 초과 시 기간의 정함이 없는 계약(무기계약)으로 전환됩니다</li>
            </ul>
          </div>
        ),
        buttonText: '이해했습니다'
      });
      return;
    }

    // 조건 2: 1년 이상
    if (isOneYearOrMore && !isMoreThanTwoYears && !shownModalsRef.current.has('oneYearOrMore')) {
      shownModalsRef.current.add('oneYearOrMore');
      setModalState({
        isOpen: true,
        type: 'info',
        title: '퇴직금 지급 의무 안내',
        content: (
          <div className="space-y-2">
            <p>계약기간이 1년 이상이면 퇴직금 지급 의무가 있습니다.</p>
            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
              <li><strong>퇴직금 = 1일 평균임금 × 30일 × (근속연수)</strong></li>
              <li>퇴직 시 14일 이내 지급해야 합니다</li>
              <li>미지급 시 지연이자(연 20%) 발생</li>
            </ul>
          </div>
        ),
        buttonText: '확인'
      });
      return;
    }

    // 조건 3: 2년 초과
    if (isMoreThanTwoYears && !shownModalsRef.current.has('moreThanTwoYears')) {
      shownModalsRef.current.add('moreThanTwoYears');
      setModalState({
        isOpen: true,
        type: 'warning',
        title: '무기계약 전환 주의',
        content: (
          <div className="space-y-2">
            <p>기간제 근로계약은 최대 2년까지만 가능합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
              <li>2년 초과 시 기간의 정함이 없는 계약(무기계약직)으로 자동 전환됩니다</li>
              <li>무기계약 전환 후에는 해고에 정당한 사유가 필요합니다</li>
            </ul>
          </div>
        ),
        buttonText: '이해했습니다'
      });
      return;
    }
  }, [contractDuration, isLessThanOneYear, isOneYearOrMore, isMoreThanTwoYears]);

  // ===== 섹션 B: 근무 시간 상태 (step-5 원본) =====
  const [selectedPreset, setSelectedPreset] = useState<'week5' | 'week3' | 'custom' | null>(null);
  const [lastModifiedDay, setLastModifiedDay] = useState<number | null>(null);

  // 기존 schedule을 새로운 형식으로 변환
  const schedule = useMemo(() => {
    if (!workCondition.schedule || workCondition.schedule.length === 0) {
      return DAYS.map((day, index) => ({
        day,
        isWorkDay: false,
        startTime: '14:00',
        endTime: '22:00',
        breakTime: 60
      }));
    }
    return DAYS.map((day, index) => {
      const existing = workCondition.schedule.find(s => s.day === day);
      return {
        day,
        isWorkDay: existing?.isWorkDay || false,
        startTime: existing?.startTime || '14:00',
        endTime: existing?.endTime || '22:00',
        breakTime: existing?.breakTime || 60
      };
    });
  }, [workCondition.schedule]);

  // 일별 근무시간 계산
  const dailyHours = useMemo(() => {
    return schedule.map((day) => {
      if (!day.isWorkDay) {
        return { totalHours: 0, workingHours: 0, breakHours: 0 };
      }
      const startMinutes = timeToMinutes(day.startTime);
      const endMinutes = timeToMinutes(day.endTime);
      const totalMinutes = endMinutes > startMinutes ? endMinutes - startMinutes : (24 * 60) - startMinutes + endMinutes;
      const totalHours = totalMinutes / 60;
      const breakHours = (day.breakTime || 0) / 60;
      const workingHours = Math.max(0, totalHours - breakHours);
      return { totalHours, workingHours, breakHours };
    });
  }, [schedule]);

  // 주간 합계 계산
  const weeklySummary = useMemo(() => {
    const weeklyTotalHours = dailyHours.reduce((sum, d) => sum + d.totalHours, 0);
    const weeklyBreakHours = dailyHours.reduce((sum, d) => sum + d.breakHours, 0);
    const weeklyWorkingHours = dailyHours.reduce((sum, d) => sum + d.workingHours, 0);
    const workingDays = schedule.filter(d => d.isWorkDay).length;
    
    // 주휴시간 계산
    const weeklyHolidayHours = weeklyWorkingHours >= LEGAL_STANDARDS.WEEKLY_HOLIDAY_THRESHOLD
      ? Math.min((weeklyWorkingHours / 40) * 8, 8)
      : 0;

    return {
      weeklyTotalHours: Math.round(weeklyTotalHours * 100) / 100,
      weeklyBreakHours: Math.round(weeklyBreakHours * 100) / 100,
      weeklyWorkingHours: Math.round(weeklyWorkingHours * 100) / 100,
      workingDays,
      isWeeklyHolidayPayEligible: weeklyWorkingHours >= LEGAL_STANDARDS.WEEKLY_HOLIDAY_THRESHOLD,
      weeklyHolidayHours: Math.round(weeklyHolidayHours * 100) / 100
    };
  }, [dailyHours, schedule]);

  // 프리셋 적용
  const applyPreset = (presetKey: 'week5' | 'week3' | 'custom') => {
    const preset = PRESETS[presetKey];
    setSelectedPreset(presetKey);
    
    const newSchedule = schedule.map((day, index) => ({
      ...day,
      isWorkDay: preset.days[index],
      startTime: preset.startTime,
      endTime: preset.endTime,
      breakTime: preset.breakTime
    }));
    
    updateWorkCondition({ schedule: newSchedule });
  };

  // 요일별 설정 변경
  const updateDaySchedule = (index: number, updates: Partial<typeof schedule[0]>) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], ...updates };
    
    // 휴게시간 자동 설정
    if (updates.startTime !== undefined || updates.endTime !== undefined || updates.isWorkDay === true) {
      const day = newSchedule[index];
      if (day.isWorkDay) {
        const startMinutes = timeToMinutes(day.startTime);
        const endMinutes = timeToMinutes(day.endTime);
        const totalMinutes = endMinutes > startMinutes ? endMinutes - startMinutes : (24 * 60) - startMinutes + endMinutes;
        const totalHours = totalMinutes / 60;
        
        // 법적 기준에 따른 휴게시간 자동 설정
        const minimumBreak = getMinimumBreakMinutes(totalHours);
        if (updates.breakTime === undefined) {
          newSchedule[index].breakTime = minimumBreak;
        }
      }
    }
    
    updateWorkCondition({ schedule: newSchedule });
    setLastModifiedDay(index);
    setSelectedPreset(null); // 프리셋 해제
  };

  // 전체 적용
  const applyToAll = () => {
    if (lastModifiedDay === null) return;
    const sourceDay = schedule[lastModifiedDay];
    
    const newSchedule = schedule.map((day, index) => {
      if (day.isWorkDay) {
        return {
          ...day,
          startTime: sourceDay.startTime,
          endTime: sourceDay.endTime,
          breakTime: sourceDay.breakTime
        };
      }
      return day;
    });
    
    updateWorkCondition({ schedule: newSchedule });
  };

  // 휴게시간 검증
  const getBreakTimeValidation = (dayIndex: number) => {
    const day = schedule[dayIndex];
    const hours = dailyHours[dayIndex];
    
    if (!day.isWorkDay || hours.totalHours === 0) return null;
    
    const minimumBreak = getMinimumBreakMinutes(hours.totalHours);
    if ((day.breakTime || 0) < minimumBreak && minimumBreak > 0) {
      return {
        type: 'warning',
        message: `근로시간이 ${hours.totalHours.toFixed(1)}시간인 경우 최소 휴게시간은 ${minimumBreak}분입니다.`
      };
    }
    if (minimumBreak === 0) {
      return { type: 'success', message: '휴게시간 기준 충족' };
    }
    return { type: 'success', message: '적정' };
  };

  // Step 연동: weeklyHours 업데이트
  useEffect(() => {
    updateWorkCondition({
      weeklyHours: weeklySummary.weeklyWorkingHours,
      workDays: weeklySummary.workingDays
    });
    recalculate();
  }, [weeklySummary.weeklyWorkingHours, weeklySummary.workingDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasBreakViolation = useMemo(() => {
    return schedule.some((day, index) => {
      if (!day.isWorkDay) return false;
      const totalHours = dailyHours[index].totalHours;
      if (totalHours === 0) return false;
      const minimumBreak = getMinimumBreakMinutes(totalHours);
      return (day.breakTime || 0) < minimumBreak;
    });
  }, [schedule, dailyHours]);

  // ===== 통합 유효성 검증 =====
  const canGoNext =
    !!(contractPeriod.startDate && contractPeriod.endDate) &&
    weeklySummary.weeklyWorkingHours > 0 &&
    !hasBreakViolation;

  return (
    <>
      <ProgressBar currentStep={2} />
      <div className="bg-white rounded-lg shadow-sm p-8">

        {/* ===== 섹션 A: 계약 기간 ===== */}
        <h2 className="text-2xl font-bold text-navy mb-2">📅 계약 기간</h2>
        <p className="text-gray-600 mb-6">근로계약의 시작일과 종료일을 설정합니다.</p>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계약 시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={contractPeriod.startDate || ''}
                onChange={(e) => updateContractPeriod({ startDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계약 기간 <span className="text-red-500">*</span>
              </label>
              <select
                value={contractPeriod.durationMonths ?? 12}
                onChange={(e) => {
                  const months = parseInt(e.target.value);
                  updateContractPeriod({ durationMonths: months });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              >
                {contractDurationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                💡 계약 기간을 선택하면 종료일이 자동으로 계산됩니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계약 종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={contractPeriod.endDate || ''}
                onChange={(e) => {
                  // 종료일을 직접 입력하면 "직접 입력" 모드로 전환
                  updateContractPeriod({ endDate: e.target.value, durationMonths: 0 });
                }}
                disabled={contractPeriod.durationMonths !== 0 && contractPeriod.durationMonths !== undefined}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy ${
                  contractPeriod.durationMonths !== 0 && contractPeriod.durationMonths !== undefined
                    ? 'bg-gray-100 cursor-not-allowed'
                    : ''
                }`}
              />
              {contractPeriod.durationMonths !== 0 && contractPeriod.durationMonths !== undefined && (
                <p className="mt-1 text-xs text-gray-500">
                  💡 계약 기간을 선택하면 종료일이 자동으로 계산되어 표시됩니다.
                </p>
              )}
              {contractPeriod.durationMonths === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  💡 종료일을 직접 입력 중입니다. 계약 기간을 다시 선택하면 자동 계산 모드로 전환됩니다.
                </p>
              )}
            </div>
          </div>

          {/* 계약기간 요약 정보 */}
          {contractDuration !== null && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600">
                📌 계약기간: <strong>{Math.floor(contractDuration / 365)}년 {Math.floor((contractDuration % 365) / 30)}개월</strong> ({contractDuration}일)
                {isLessThanOneYear && ' • 퇴직금 지급 의무 없음'}
                {isOneYearOrMore && !isMoreThanTwoYears && ' • 퇴직금 지급 의무 있음'}
                {isMoreThanTwoYears && ' • 무기계약 전환 주의'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수습 기간
            </label>
            <select
              value={contractPeriod.probationMonths}
              onChange={(e) => updateContractPeriod({ probationMonths: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
            >
              <option value={0}>없음</option>
              <option value={1}>1개월</option>
              <option value={2}>2개월</option>
              <option value={3}>3개월</option>
            </select>
            {contractPeriod.probationMonths === 0 && (
              <p className="mt-2 text-xs text-gray-500">💡 권장: 3개월 이내</p>
            )}
            {contractPeriod.probationMonths > 0 && contractPeriod.probationMonths <= 3 && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800">
                  ✅ <strong>적정 수습기간입니다.</strong> 일반적으로 3개월 이내의 수습기간은 법적으로 문제없습니다.
                </p>
              </div>
            )}
            {contractPeriod.probationMonths > 3 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-800">
                  ⚠️ <strong>법적 리스크가 있습니다.</strong> 수습기간이 3개월을 초과하면 정당한 사유 없이 수습기간을 연장한 것으로 보아 법적 분쟁이 발생할 수 있습니다. 판례상 3개월을 초과하는 수습기간은 부당할 가능성이 높습니다.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===== 구분선 ===== */}
        <div className="border-t border-gray-200 my-8" />

        {/* ===== 섹션 B: 근무 시간 ===== */}
        <h2 className="text-2xl font-bold text-navy mb-2">⏰ 근무 시간</h2>
        <p className="text-gray-600 mb-6">요일별 근무 시간을 설정합니다.</p>

        <div className="space-y-6">
          {/* 빠른 설정 프리셋 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">⚡ 빠른 설정</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as 'week5' | 'week3' | 'custom')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedPreset === key
                      ? 'border-navy bg-navy/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{preset.name}</div>
                  {preset.description && (
                    <div className="text-sm text-gray-600 mt-1">{preset.description}</div>
                  )}
                  <div className="text-sm text-gray-500 mt-2">
                    {preset.startTime}~{preset.endTime}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">휴게 {preset.breakTime}분</div>
                  {preset.weeklyHours > 0 && (
                    <div className="text-xs text-navy mt-1 font-medium">소정근로 {preset.weeklyHours}시간</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 요일별 카드 */}
          <div className="space-y-3">
            {schedule.map((day, index) => {
              const hours = dailyHours[index];
              const validation = getBreakTimeValidation(index);
              const isExpanded = day.isWorkDay;
              
              return (
                <div
                  key={day.day}
                  className={`border-2 rounded-lg transition-all duration-300 ${
                    isExpanded
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* 카드 헤더 */}
                  <div className="flex items-center justify-between p-4">
                    <span className="font-medium text-gray-900">{day.day}요일</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.isWorkDay}
                        onChange={(e) => updateDaySchedule(index, { isWorkDay: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                      <span className="ml-3 text-sm text-gray-700">
                        {day.isWorkDay ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>

                  {/* 카드 본문 (ON일 때만 표시) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* 근무시간 설정 (30분 단위) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">근무시간</label>
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <select
                              value={day.startTime}
                              onChange={(e) => updateDaySchedule(index, { startTime: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                          <span className="text-gray-500">~</span>
                          <div className="flex-1">
                            <select
                              value={day.endTime}
                              onChange={(e) => updateDaySchedule(index, { endTime: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* 휴게시간 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">휴게시간</label>
                        <p className="text-xs text-gray-500 mb-2">
                          근로시간 8시간 이상 → 1시간, 미만 → 30분
                        </p>
                        <div className="flex items-center space-x-3">
                          <select
                            value={day.breakTime || 0}
                            onChange={(e) => updateDaySchedule(index, { breakTime: parseInt(e.target.value) })}
                            className={`px-3 py-2 border rounded-lg ${
                              validation?.type === 'warning' ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value={0}>0분</option>
                            <option value={30}>30분</option>
                            <option value={60}>1시간</option>
                            <option value={90}>1시간 30분</option>
                            <option value={120}>2시간</option>
                          </select>
                          {validation && (
                            <span className={`text-xs ${
                              validation.type === 'warning' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {validation.type === 'warning' ? '⚠️' : '✓'} {validation.message}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 요약 */}
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          근무 {hours.totalHours.toFixed(1)}시간 - 휴게 {hours.breakHours.toFixed(1)}시간 = 소정근로 {hours.workingHours.toFixed(1)}시간
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 전체 적용 버튼 */}
          {lastModifiedDay !== null && schedule[lastModifiedDay].isWorkDay && (
            <div>
              <button
                onClick={applyToAll}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                📋 현재 설정을 모든 근무일에 적용
              </button>
            </div>
          )}

          {/* 주간 요약 정보 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">📊 주 소정근로시간:</span> {weeklySummary.weeklyWorkingHours}시간 · {weeklySummary.workingDays}일 근무
              </p>
              <p className="text-xs text-gray-600">
                (총 체류 {weeklySummary.weeklyTotalHours}시간 - 휴게 {weeklySummary.weeklyBreakHours}시간)
              </p>
              <p className="text-xs text-gray-600">
                휴게시간은 근로시간에 따라 자동 설정되어 근로기준법을 준수합니다.
              </p>
              {weeklySummary.isWeeklyHolidayPayEligible ? (
                <p className="text-sm text-green-700 font-medium">
                  ✓ 주휴수당 지급 대상 (주 {LEGAL_STANDARDS.WEEKLY_HOLIDAY_THRESHOLD}시간 이상)
                </p>
              ) : (
                <p className="text-sm text-amber-700 font-medium">
                  ⚠️ 주휴수당 미지급 (주 {LEGAL_STANDARDS.WEEKLY_HOLIDAY_THRESHOLD}시간 미만)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===== 네비게이션 ===== */}
        <NavigationButtons
          onPrevious={() => router.push('/wizard/type-a/step-1')}
          onNext={() => router.push('/wizard/type-a/step-3')}
          canGoNext={canGoNext}
        />

        {/* 계약기간 팝업 모달 */}
        {modalState && (
          <ContractPeriodModal
            isOpen={modalState.isOpen}
            onClose={() => setModalState({ ...modalState, isOpen: false })}
            type={modalState.type}
            title={modalState.title}
            content={modalState.content}
            buttonText={modalState.buttonText}
          />
        )}
      </div>
    </>
  );
}
