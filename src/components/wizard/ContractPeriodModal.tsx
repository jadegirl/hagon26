'use client';

import { useEffect } from 'react';

interface ContractPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'warning' | 'info';
  title: string;
  content: React.ReactNode;
  buttonText?: string;
}

export default function ContractPeriodModal({
  isOpen,
  onClose,
  type,
  title,
  content,
  buttonText = '확인'
}: ContractPeriodModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const bgColor = type === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
  const borderColor = type === 'warning' ? 'border-amber-300' : 'border-blue-300';
  const iconColor = type === 'warning' ? 'text-amber-600' : 'text-blue-600';
  const buttonColor = type === 'warning' 
    ? 'bg-amber-600 hover:bg-amber-700' 
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md ${bgColor} border-2 ${borderColor} rounded-lg shadow-xl`}>
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start mb-4">
            <div className={`text-3xl mr-3 ${iconColor}`}>
              {type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <h3 className="text-lg font-bold text-gray-900 flex-1">
              {title}
            </h3>
          </div>
          
          {/* Content */}
          <div className="text-sm text-gray-700 mb-6 leading-relaxed">
            {content}
          </div>
          
          {/* Button */}
          <button
            onClick={onClose}
            className={`w-full py-3 px-4 ${buttonColor} text-white font-medium rounded-lg transition-colors`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}






