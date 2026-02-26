'use client';

interface NavigationButtonsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  canGoNext?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  showPrevious?: boolean;
  showNext?: boolean;
}

export default function NavigationButtons({
  onPrevious,
  onNext,
  canGoNext = true,
  nextLabel = '다음',
  previousLabel = '이전',
  showPrevious = true,
  showNext = true,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
      {showPrevious && onPrevious ? (
        <button
          type="button"
          onClick={onPrevious}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          {previousLabel}
        </button>
      ) : (
        <div />
      )}
      
      {showNext && onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            canGoNext
              ? 'bg-navy text-white hover:bg-navy/90'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
