'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AcademyInfo {
  id?: string;
  user_id: string;
  academy_name: string;
  academy_address: string;
  representative_name: string;
  contact: string;
  business_number: string;
  stamp_image_url?: string | null;
}

export default function WizardGatewayPage() {
  const router = useRouter();
  const {
    updateAcademy,
    hasSavedData,
    reset,
    setSignatureImageUrl,
  } = useWizardStore();
  const sourceContractStatus = useWizardStore((s) => s.sourceContractStatus);
  const setSourceContractStatus = useWizardStore((s) => s.setSourceContractStatus);
  const draftId = useWizardStore((s) => s.draftId);
  const setDraftId = useWizardStore((s) => s.setDraftId);

  const [isLoading, setIsLoading] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);

  const isSigned = sourceContractStatus === 'signed' || sourceContractStatus === 'pending_signature';

  // 1. 세션 확인 + 학원정보 자동 조회 → store 세팅
  useEffect(() => {
    const checkSessionAndLoadAcademy = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/login');
          return;
        }

        // academy_info 조회
        const { data, error } = await supabase
          .from('academy_info')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('학원정보 불러오기 오류:', error);
        }

        if (!data) {
          // 학원정보 없으면 설정 페이지로 이동
          alert('학원 정보를 먼저 등록해주세요.');
          router.push('/settings');
          return;
        }

        // store에 학원정보 세팅
        updateAcademy({
          name: data.academy_name,
          address: data.academy_address,
          representative: data.representative_name,
          phone: data.contact,
          businessNumber: data.business_number,
        });
        if (data.stamp_image_url) {
          setSignatureImageUrl(data.stamp_image_url);
        }
      } catch (error) {
        console.error('세션 확인 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionAndLoadAcademy();
  }, [router, updateAcademy, setSignatureImageUrl]);

  // 2. 로딩 완료 후 기존 작성 데이터 확인
  useEffect(() => {
    if (isLoading) return;
    if (typeof window === 'undefined') return;

    const hasShownModal = sessionStorage.getItem('wizard-resume-modal-shown');

    if (!hasShownModal && hasSavedData()) {
      // draftId가 있으면 DB에서 실제 상태 확인
      const checkStatus = async () => {
        if (draftId) {
          try {
            const { data } = await supabase
              .from('contracts')
              .select('status')
              .eq('id', draftId)
              .maybeSingle();
            if (data?.status) {
              setSourceContractStatus(data.status);
            }
          } catch {
            // 조회 실패 시 기존 store 값 사용
          }
        }
        setShowResumeModal(true);
        sessionStorage.setItem('wizard-resume-modal-shown', 'true');
      };
      checkStatus();
    } else if (!hasSavedData()) {
      // 기존 데이터 없으면 바로 step-1로 이동
      router.push('/wizard/type-a/step-1');
    }
  }, [isLoading, hasSavedData, draftId, setSourceContractStatus, router]);

  // 이어서 작성
  const handleResume = () => {
    setShowResumeModal(false);
    router.push('/wizard/type-a/step-1');
  };

  // 새로 작성 (완전 초기화)
  const handleNewContract = () => {
    reset();
    setShowResumeModal(false);
    router.push('/wizard/type-a/step-1');
  };

  // 재계약 작성 (기존 데이터 유지하되 새 계약서로)
  const handleRecontract = () => {
    setDraftId(null);
    setSourceContractStatus(null);
    setShowResumeModal(false);
    router.push('/wizard/type-a/step-1');
  };

  return (
    <>
      {/* 이전 작성 데이터 확인 모달 — 항상 렌더링, opacity/pointer-events 토글 */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        showResumeModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="fixed inset-0 bg-black/50" />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
          {isSigned ? (
            <>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">이전 계약 데이터 확인</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                이전에 체결 완료된 계약서의 데이터가 남아있습니다.
                <br />
                이 데이터를 기반으로 <strong>새 계약서(재계약)</strong>를 작성하시겠습니까?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleNewContract}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  처음부터 작성
                </button>
                <button
                  onClick={handleRecontract}
                  className="px-4 py-2 bg-[#FFD85C] text-gray-900 rounded-lg hover:bg-[#f5c84a] transition-colors font-semibold"
                >
                  재계약 작성
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">이전 작성 데이터 확인</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                이전에 작성하던 계약서가 있습니다. 이어서 작성하시겠습니까?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleNewContract}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  새로 작성
                </button>
                <button
                  onClick={handleResume}
                  className="px-4 py-2 bg-[#FFD85C] text-gray-900 rounded-lg hover:bg-[#f5c84a] transition-colors font-semibold"
                >
                  이어서 작성
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 로딩 중 표시 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
        <div className="text-center py-16">
          <div className="text-gray-600 dark:text-gray-400">
            {isLoading ? '학원 정보를 확인하는 중...' : '계약서 작성을 준비하는 중...'}
          </div>
        </div>
      </div>
    </>
  );
}
