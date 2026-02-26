'use client';

import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard-store';
import NavigationButtons from '@/components/wizard/NavigationButtons';
import ProgressBar from '@/components/wizard/ProgressBar';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Academy } from '@/types/wizard';
import type { User } from '@supabase/supabase-js';
import StampUploader from '@/components/StampUploader';

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

export default function AcademyInfoPage() {
  const router = useRouter();
  const {
    academy,
    updateAcademy,
    hasSavedData,
    reset,
    currentStep,
    signatureImageUrl,
    setSignatureImageUrl,
  } = useWizardStore();
  const [user, setUser] = useState<User | null>(null);
  const [savedAcademyInfo, setSavedAcademyInfo] = useState<AcademyInfo | null>(null);
  const [showLoadButton, setShowLoadButton] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const sourceContractStatus = useWizardStore((s) => s.sourceContractStatus);
  const setSourceContractStatus = useWizardStore((s) => s.setSourceContractStatus);
  const draftId = useWizardStore((s) => s.draftId);
  const setDraftId = useWizardStore((s) => s.setDraftId);
  const isSigned = sourceContractStatus === 'signed' || sourceContractStatus === 'pending_signature';

  const canGoNext = academy.name && academy.address && academy.representative;

  // 사용자 세션 확인 및 저장된 학원정보 불러오기
  useEffect(() => {
    const checkSessionAndLoadAcademy = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          // 저장된 학원정보 불러오기
          const { data, error } = await supabase
            .from('academy_info')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') { // PGRST116은 "no rows returned" 에러
            console.error('학원정보 불러오기 오류:', error);
          } else if (data) {
            setSavedAcademyInfo(data);
            setShowLoadButton(true);
            if (data.stamp_image_url) {
              setSignatureImageUrl(data.stamp_image_url);
            }
          }
        } else {
          // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
          router.push('/login');
        }
      } catch (error) {
        console.error('세션 확인 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionAndLoadAcademy();
  }, [router, setSignatureImageUrl]);

  // 페이지 로드 시 이전 작성 데이터 확인 (첫 진입 시에만)
  useEffect(() => {
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
    }
  }, [hasSavedData, draftId, setSourceContractStatus]);

  // 이어서 작성 (draft 상태인 경우만)
  const handleResume = () => {
    setShowResumeModal(false);
  };

  // 새로 작성 (완전 초기화)
  const handleNewContract = () => {
    reset();
    setShowResumeModal(false);
  };

  // 재계약 작성 (기존 데이터 유지하되 새 계약서로)
  const handleRecontract = () => {
    // draftId를 null로 변경하여 새 계약서로 저장되게 함
    setDraftId(null);
    setSourceContractStatus(null);
    setShowResumeModal(false);
  };

  // 저장된 학원정보 불러오기
  const handleLoadAcademy = () => {
    if (!savedAcademyInfo) return;

    updateAcademy({
      name: savedAcademyInfo.academy_name,
      address: savedAcademyInfo.academy_address,
      representative: savedAcademyInfo.representative_name,
      phone: savedAcademyInfo.contact,
      businessNumber: savedAcademyInfo.business_number,
    });
    alert('저장된 학원정보를 불러왔습니다.');
  };

  // 학원정보 저장
  const handleSaveAcademy = async () => {
    if (!academy.name || !academy.address || !academy.representative) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsSaving(true);
    try {
      const academyData: AcademyInfo = {
        user_id: user.id,
        academy_name: academy.name,
        academy_address: academy.address,
        representative_name: academy.representative,
        contact: academy.phone || '',
        business_number: academy.businessNumber || '',
      };

      if (savedAcademyInfo?.id) {
        // 기존 정보 업데이트
        const { error } = await supabase
          .from('academy_info')
          .update(academyData)
          .eq('id', savedAcademyInfo.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('학원정보 업데이트 오류:', error);
          alert('학원정보 저장에 실패했습니다.');
          setIsSaving(false);
          return;
        }
      } else {
        // 새 정보 저장
        const { data, error } = await supabase
          .from('academy_info')
          .insert([academyData])
          .select()
          .single();

        if (error) {
          console.error('학원정보 저장 오류:', error);
          alert('학원정보 저장에 실패했습니다.');
          setIsSaving(false);
          return;
        }

        if (data) {
          setSavedAcademyInfo(data);
          setShowLoadButton(true);
        }
      }

      setIsSaving(false);
      alert('학원정보가 저장되었습니다.');
    } catch (error) {
      console.error('학원정보 저장 오류:', error);
      alert('학원정보 저장에 실패했습니다.');
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      router.push('/wizard/type-a/step-1');
    }
  };

  return (
    <>
      <ProgressBar currentStep={0} />
      
      {/* 이전 작성 데이터 확인 모달 */}
      {showResumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {isSigned ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">이전 계약 데이터 확인</h3>
                <p className="text-gray-600 mb-6">
                  이전에 체결 완료된 계약서의 데이터가 남아있습니다.
                  <br />
                  이 데이터를 기반으로 <strong>새 계약서(재계약)</strong>를 작성하시겠습니까?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleNewContract}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
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
                <h3 className="text-xl font-bold text-gray-900 mb-4">이전 작성 데이터 확인</h3>
                <p className="text-gray-600 mb-6">
                  이전에 작성하던 계약서가 있습니다. 이어서 작성하시겠습니까?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleNewContract}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
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
      )}
      
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center py-8">
            <div className="text-gray-600">로딩 중...</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-navy mb-2">학원 정보를 입력해주세요</h1>
            <p className="text-gray-600">계약의 당사자인 학원 정보를 입력합니다.</p>
          </div>
          <div className="flex gap-2">
            {showLoadButton && savedAcademyInfo && (
              <button
                onClick={handleLoadAcademy}
                className="px-4 py-2 text-sm bg-[#FFD85C] text-gray-900 rounded-lg hover:bg-[#f5c84a] transition-colors font-semibold"
              >
                저장된 학원정보 불러오기
              </button>
            )}
            <button
              onClick={handleSaveAcademy}
              disabled={!canGoNext || isSaving}
              className="px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '학원정보 저장'}
            </button>
          </div>
        </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            학원명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={academy.name}
            onChange={(e) => updateAcademy({ name: e.target.value })}
            placeholder="학원명을 입력하세요"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            학원 주소 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={academy.address}
            onChange={(e) => updateAcademy({ address: e.target.value })}
            placeholder="학원 주소"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            대표자명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={academy.representative}
            onChange={(e) => updateAcademy({ representative: e.target.value })}
            placeholder="대표자 이름"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">학원 연락처</label>
          <input
            type="text"
            value={academy.phone}
            onChange={(e) => updateAcademy({ phone: e.target.value })}
            placeholder="연락처"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">사업자등록번호</label>
          <input
            type="text"
            value={academy.businessNumber}
            onChange={(e) => updateAcademy({ businessNumber: e.target.value })}
            placeholder="000-00-00000"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        {user && (
          <StampUploader
            userId={user.id}
            academyInfo={{
              academy_name: academy.name,
              academy_address: academy.address,
              representative_name: academy.representative,
              contact: academy.phone,
              business_number: academy.businessNumber,
            }}
            autoUpload
            label="학원 직인(인장) 등록"
            description="직인을 등록하면 계약 생성 시 자동으로 포함됩니다."
            previewSize={80}
            initialUrl={signatureImageUrl || null}
            onUploaded={(url) => setSignatureImageUrl(url)}
          />
        )}
      </div>

        <NavigationButtons
          onNext={handleNext}
          canGoNext={!!canGoNext}
          showPrevious={false}
          nextLabel="다음"
        />
        </div>
      )}
    </>
  );
}
