'use client';

import { useRouter } from 'next/navigation';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';

export default function Step3Page() {
  const router = useRouter();

  return (
    <>
      <ProgressBar currentStep={3} />
      <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-navy mb-2">계약 유형 확인</h1>
      <p className="text-gray-600 mb-8">근로계약서를 작성합니다.</p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-navy mb-2">📋 강사근로계약서</h2>
        <p className="text-gray-700">
          학원과 강사 간의 근로관계를 명확히 하는 계약서입니다.
          법적 요건을 충족하는 표준 계약서 양식으로 작성됩니다.
        </p>
      </div>

      <NavigationButtons
        onPrevious={() => router.push('/wizard/type-a/step-1')}
        onNext={() => router.push('/wizard/type-a/step-4')}
        canGoNext={true}
      />
      </div>
    </>
  );
}
