'use client';

import { useEffect } from 'react';

interface SalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  type: 'warning' | 'info' | 'error';
  title: string;
  content: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export default function SalaryModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  content,
  confirmText = '확인',
  cancelText = '취소',
  showCancel = false
}: SalaryModalProps) {
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

  const bgColor = 
    type === 'warning' ? 'bg-amber-50' : 
    type === 'error' ? 'bg-red-50' : 
    'bg-blue-50';
  const borderColor = 
    type === 'warning' ? 'border-amber-300' : 
    type === 'error' ? 'border-red-300' : 
    'border-blue-300';
  const iconColor = 
    type === 'warning' ? 'text-amber-600' : 
    type === 'error' ? 'text-red-600' : 
    'text-blue-600';
  const buttonColor = 
    type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 
    type === 'error' ? 'bg-red-600 hover:bg-red-700' : 
    'bg-blue-600 hover:bg-blue-700';
  const icon = 
    type === 'warning' ? '⚠️' : 
    type === 'error' ? '🚨' : 
    '💡';

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
              {icon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 flex-1">
              {title}
            </h3>
          </div>
          
          {/* Content */}
          <div className="text-sm text-gray-700 mb-6 leading-relaxed">
            {content}
          </div>
          
          {/* Buttons */}
          <div className={`flex gap-3 ${showCancel ? '' : 'justify-end'}`}>
            {showCancel && (
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm || onClose}
              className={`${showCancel ? 'flex-1' : 'w-full'} py-3 px-4 ${buttonColor} text-white font-medium rounded-lg transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}






