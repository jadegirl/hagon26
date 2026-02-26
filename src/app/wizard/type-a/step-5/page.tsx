'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';
import { useState, useMemo, useEffect } from 'react';
import { LEGAL_STANDARDS } from '@/constants/legalStandards';

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

export default function Step5Page() {
  const router = useRouter();
  const { workCondition, updateWorkCondition, recalculate } = useWizardStore();
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

  // Step 6 연동: weeklyHours 업데이트
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

  const canGoNext = weeklySummary.weeklyWorkingHours > 0 && !hasBreakViolation;

  return (
    <>
      <ProgressBar currentStep={5} />
      <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-navy mb-2">근무 조건을 설정해주세요</h1>
      <p className="text-gray-600 mb-8">요일별 근무 시간을 설정합니다.</p>
      
      <div className="space-y-6">
        {/* 섹션 1: 빠른 설정 프리셋 */}
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

        {/* 섹션 2: 요일별 카드 */}
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

        {/* 섹션 3: 전체 적용 버튼 */}
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

        {/* 섹션 4: 요약 정보 */}
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

      <NavigationButtons
        onPrevious={() => router.push('/wizard/type-a/step-4')}
        onNext={() => router.push('/wizard/type-a/step-6')}
        canGoNext={canGoNext}
      />
      </div>
    </>
  );
}
