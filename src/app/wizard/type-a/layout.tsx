'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const TOTAL_STEPS = 8;

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // 현재 스텝 추출
  let currentStep = 1;
  let isPreview = false;
  let isComplete = false;
  let isStepPage = false;
  
  if (pathname.includes('step-')) {
    const match = pathname.match(/step-(\d+)/);
    if (match) {
      currentStep = parseInt(match[1]);
    }
    isStepPage = true;
  } else if (pathname.includes('preview')) {
    isPreview = true;
  } else if (pathname.includes('complete')) {
    isComplete = true;
    currentStep = TOTAL_STEPS;
  }

  const progress = isPreview || isComplete ? 100 : (currentStep / TOTAL_STEPS) * 100;

  // 수동 저장 함수 (persist가 자동 저장하지만 사용자에게 피드백 제공)
  const handleManualSave = () => {
    // persist 미들웨어가 자동으로 저장하므로, 단순히 메시지만 표시
    setSaveMessage('임시 저장되었습니다.');
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const handleExit = () => {
    // persist로 자동 저장되므로, 사용자 피드백 후 이동
    handleManualSave();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isStepPage && (
              <button
                onClick={handleExit}
                className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                나가기
              </button>
            )}
            <h1 className="text-xl font-bold">학온 계약서 마법사</h1>
          </div>
          <div className="flex items-center gap-4">
            {!isPreview && !isComplete && (
              <button
                onClick={handleManualSave}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                임시 저장
              </button>
            )}
            {saveMessage && (
              <span className="text-sm text-green-300 animate-fade-in">
                {saveMessage}
              </span>
            )}
            {isPreview ? (
              <span className="text-sm text-blue-200">
                계약서 미리보기
              </span>
            ) : isComplete ? (
              <span className="text-sm text-blue-200">
                계약서 완료
              </span>
            ) : (
              <span className="text-sm text-blue-200">
                Step {currentStep} / {TOTAL_STEPS}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="bg-gray-200 h-2">
        <div 
          className="bg-navy h-2 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <main className="max-w-4xl mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  );
}
