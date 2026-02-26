'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';
import ContractPeriodModal from '@/components/wizard/ContractPeriodModal';
import { useMemo, useState, useRef, useEffect } from 'react';

export default function Step4Page() {
  const router = useRouter();
  const { contractPeriod, updateContractPeriod } = useWizardStore();
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

  const canGoNext = contractPeriod.startDate && contractPeriod.endDate;

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

  return (
    <>
      <ProgressBar currentStep={4} />
      <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-navy mb-2">계약 기간을 설정해주세요</h1>
      <p className="text-gray-600 mb-8">근로계약의 시작일과 종료일을 설정합니다.</p>
      
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

        {/* 계약기간 요약 정보 (팝업과 중복 제거, 간소화) */}
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

      <NavigationButtons
        onPrevious={() => router.push('/wizard/type-a/step-3')}
        onNext={() => router.push('/wizard/type-a/step-5')}
        canGoNext={!!canGoNext}
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
