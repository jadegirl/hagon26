'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';

export default function Step1Page() {
  const router = useRouter();
  const { instructor, updateInstructor } = useWizardStore();

  const canGoNext = instructor.name && instructor.subject;

  const handleNext = () => {
    if (canGoNext) {
      router.push('/wizard/type-a/step-3');
    }
  };

  return (
    <>
      <ProgressBar currentStep={1} />
      <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-navy mb-2">강사 정보를 입력해주세요</h1>
      <p className="text-gray-600 mb-8">계약을 맺을 강사의 기본 정보를 입력합니다.</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            강사 이름
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={instructor.name}
            onChange={(e) => updateInstructor({ name: e.target.value })}
            placeholder="강사 이름을 입력하세요"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            담당 과목
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={instructor.subject}
            onChange={(e) => updateInstructor({ subject: e.target.value })}
            placeholder="예: 수학, 영어, 피아노"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            주소
          </label>
          <input
            type="text"
            value={instructor.address}
            onChange={(e) => updateInstructor({ address: e.target.value })}
            placeholder="강사 주소"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            연락처
          </label>
          <input
            type="text"
            value={instructor.phone}
            onChange={(e) => updateInstructor({ phone: e.target.value })}
            placeholder="010-0000-0000"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            생년월일
          </label>
          <input
            type="date"
            value={instructor.birthDate}
            onChange={(e) => updateInstructor({ birthDate: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent"
          />
        </div>
      </div>

      <NavigationButtons
        onPrevious={() => router.push('/wizard/type-a')}
        onNext={handleNext}
        canGoNext={!!canGoNext}
      />
      </div>
    </>
  );
}

