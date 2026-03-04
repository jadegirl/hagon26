'use client';

interface ProgressBarProps {
  currentStep: number;
  currentStepLabel?: string;
}

const stepGroups = [
  { group: 1, steps: [1], label: '강사 정보' },
  { group: 2, steps: [2, 3, 4], label: '계약 설정' },
  { group: 3, steps: [5], label: '검토·완료' },
];

const stepLabels: Record<number, string> = {
  1: '강사 정보 입력',
  2: '근무 조건 설정',
  3: '급여 설정',
  4: '특약사항',
  5: '검토 및 완료',
};

export default function ProgressBar({ currentStep, currentStepLabel }: ProgressBarProps) {
  const getCurrentGroup = () => {
    for (const group of stepGroups) {
      if (group.steps.includes(currentStep)) {
        return group.group;
      }
    }
    return 1;
  };

  const currentGroup = getCurrentGroup();
  const currentStepName = currentStepLabel || stepLabels[currentStep] || '';

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* 3단계 진행 바 */}
        <div className="flex items-center justify-between mb-2">
          {stepGroups.map((group, index) => {
            const isCompleted = group.group < currentGroup;
            const isCurrent = group.group === currentGroup;
            const isPending = group.group > currentGroup;

            return (
              <div key={group.group} className="flex items-center flex-1">
                {/* 단계 번호 및 라벨 */}
                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {/* 원형 아이콘 */}
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                          isCompleted
                            ? 'bg-blue-600 text-white'
                            : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-base">
                            {group.group === 1 ? '①' : group.group === 2 ? '②' : '③'}
                          </span>
                        )}
                      </div>
                      <div
                        className={`mt-2 text-xs ${
                          isCompleted || isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-400'
                        }`}
                      >
                        {group.label}
                      </div>
                    </div>

                    {/* 연결선 */}
                    {index < stepGroups.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-2 ${
                          isCompleted ? 'bg-blue-600' : isCurrent ? 'bg-gray-300' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 현재 단계 세부 정보 */}
        {currentStepName && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              현재: <span className="text-blue-600 font-medium">{currentStepName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
