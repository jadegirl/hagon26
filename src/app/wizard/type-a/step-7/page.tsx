'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';

export default function Step7Page() {
  const router = useRouter();
  const { specialTerms, updateSpecialTerms } = useWizardStore();

  return (
    <>
      <ProgressBar currentStep={7} />
      <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-navy mb-2">특약사항</h1>
      <p className="text-gray-600 mb-8">계약서에 추가할 특약사항이 있으면 입력해주세요.</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            특약사항 (선택)
          </label>
          <textarea
            value={specialTerms}
            onChange={(e) => updateSpecialTerms(e.target.value)}
            placeholder="추가적인 약정사항이 있으면 입력해주세요..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy resize-none"
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium">💡 Tip</p>
          <p className="text-sm text-amber-700 mt-1">
            특약사항에는 기본 계약서에 포함되지 않은 추가적인 합의 내용을 기재합니다.
            예: 교재비 정산 방식, 수업 준비 시간 관련 사항 등
          </p>
        </div>
      </div>

      <NavigationButtons
        onPrevious={() => router.push('/wizard/type-a/step-6')}
        onNext={() => router.push('/wizard/type-a/step-8')}
        canGoNext={true}
      />
      </div>
    </>
  );
}
