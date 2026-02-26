'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWizardStore } from '@/lib/wizard-store';
import { supabase } from '@/lib/supabase';

export default function CompletePage() {
  const router = useRouter();
  const { reset, clearStorage, ...wizardData } = useWizardStore();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [kakaoDisabledReason, setKakaoDisabledReason] = useState('SDK 미로딩');
  const [isPartnerFlow, setIsPartnerFlow] = useState(false);
  const [partnerReturnUrl, setPartnerReturnUrl] = useState<string | null>(null);
  const [partnerCallbackDone, setPartnerCallbackDone] = useState(false);
  const kakaoLogoUrl = 'https://hagon-cloud.vercel.app/logo.png';
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

  useEffect(() => {
    // 페이지 로드 시 자동으로 계약서 저장 (중복 실행 방지)
    const saveContract = async () => {
      // sessionStorage 기반 중복 실행 방지 (새로고침에도 유지)
      const alreadySavedId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('hagon-complete-saved-contract-id') 
        : null;
      
      if (alreadySavedId) {
        setContractId(alreadySavedId);
        setSaveSuccess(true);
        return;
      }

      try {
        setSaving(true);
        setSaveError(null);

        // 현재 사용자 확인
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('로그인이 필요합니다.');
        }

        let stampImageUrl = wizardData.signatureImageUrl || '';
        try {
          const { data: academyInfo } = await supabase
            .from('academy_info')
            .select('stamp_image_url')
            .eq('user_id', user.id)
            .maybeSingle();

          if (academyInfo?.stamp_image_url) {
            stampImageUrl = academyInfo.stamp_image_url;
          }
        } catch (stampError) {
          console.warn('학원 직인 조회 실패:', stampError);
        }

        // 계약서 데이터 준비
        const contractData = {
          academy: wizardData.academy,
          instructor: wizardData.instructor,
          contractPeriod: wizardData.contractPeriod,
          workCondition: wizardData.workCondition,
          salary: wizardData.salary,
          protection: wizardData.protection,
          specialTerms: wizardData.specialTerms,
          calculated: wizardData.calculated,
          signature_image_url: stampImageUrl,
        };

        // 기존 draftId가 있고 아직 draft 상태이면 업데이트, 아니면 새로 생성
        const existingDraftId = wizardData.draftId;
        const existingStatus = wizardData.sourceContractStatus;
        let savedContractId: string | null = null;

        // signed/pending_signature 상태의 계약서는 업데이트하지 않고 새로 생성
        if (existingDraftId && existingStatus !== 'signed' && existingStatus !== 'pending_signature') {
          const { data: updatedContract, error: updateError } = await supabase
            .from('contracts')
            .update({
              contract_data: contractData,
              status: 'draft',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingDraftId)
            .eq('user_id', user.id)
            .eq('status', 'draft')
            .select('id')
            .single();

          if (!updateError && updatedContract?.id) {
            savedContractId = updatedContract.id;
          }
        }

        // 업데이트 실패 또는 새 계약서인 경우 insert
        if (!savedContractId) {
          const { data: insertedContract, error: insertError } = await supabase
            .from('contracts')
            .insert({
              user_id: user.id,
              contract_data: contractData,
              status: 'draft',
            })
            .select('id')
            .single();

          if (insertError) {
            throw insertError;
          }
          savedContractId = insertedContract?.id || null;
        }

        if (savedContractId) {
          setContractId(savedContractId);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('hagon-complete-saved-contract-id', savedContractId);
          }
        }

        // 저장 성공 시 localStorage 삭제 (zustand 메모리는 유지)
        clearStorage();

        // --- 파트너 콜백 처리 ---
        try {
          const partnerSessionRaw = typeof window !== 'undefined'
            ? sessionStorage.getItem('hagon-partner-session')
            : null;

          if (partnerSessionRaw) {
            const partnerSession = JSON.parse(partnerSessionRaw);
            setIsPartnerFlow(true);
            setPartnerReturnUrl(partnerSession.return_url || null);

            const callbackResponse = await fetch('/api/partner/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_token: partnerSession.session_token,
                contract_id: savedContractId,
                instructor_name: wizardData.instructor?.name || '',
                contract_start_date: wizardData.contractPeriod?.startDate || '',
                contract_end_date: wizardData.contractPeriod?.endDate || '',
              }),
            });

            if (callbackResponse.ok) {
              setPartnerCallbackDone(true);
            }

            sessionStorage.removeItem('hagon-partner-session');
          }
        } catch (partnerError) {
          console.error('파트너 콜백 처리 오류:', partnerError);
        }
        // --- 파트너 콜백 처리 끝 ---

        setSaveSuccess(true);
      } catch (error: any) {
        console.error('계약서 저장 오류:', error);
        setSaveError(error.message || '계약서 저장에 실패했습니다.');
      } finally {
        setSaving(false);
      }
    };

    saveContract();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let attempts = 0;
    const checkReady = () => {
      const kakao = (window as any).Kakao;
      if (kakao) {
        if (!kakao.isInitialized?.() && kakaoKey) {
          try {
            kakao.init(kakaoKey);
          } catch (error) {
            console.warn('Kakao SDK 초기화 실패:', error);
            setKakaoDisabledReason('init 실패');
          }
        }
        if (kakao.isInitialized?.()) {
          setKakaoReady(true);
          setKakaoDisabledReason('');
          return;
        }
        if (!kakaoKey) {
          setKakaoDisabledReason('키 없음');
        } else if (!kakao.isInitialized?.()) {
          setKakaoDisabledReason('도메인 미등록');
        }
      } else {
        setKakaoDisabledReason('SDK 미로딩');
      }
      attempts += 1;
      if (attempts >= 10) return;
      window.setTimeout(checkReady, 300);
    };
    checkReady();
  }, [kakaoKey]);

  const handleNewContract = () => {
    reset(); // reset에서도 localStorage 삭제됨
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('hagon-complete-saved-contract-id');
    }
    router.push('/wizard/type-a');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleCopySignLink = async () => {
    if (!contractId || typeof window === 'undefined') return;
    const signUrl = `${window.location.origin}/sign/${contractId}`;

    try {
      await navigator.clipboard.writeText(signUrl);
      alert('서명 링크가 복사되었습니다. 강사님께 카톡으로 전달해주세요!');
    } catch (error) {
      console.error('서명 링크 복사 실패:', error);
      alert('서명 링크 복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleKakaoSignRequest = async () => {
    if (!contractId || typeof window === 'undefined') return;
    const signUrl = `${window.location.origin}/sign/${contractId}`;
    const kakao = (window as any).Kakao;

    try {
      if (kakao && !kakao.isInitialized?.() && kakaoKey) {
        kakao.init(kakaoKey);
      }
      if (kakao?.isInitialized?.()) {
        kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '[학온] 계약서 서명 요청',
            description: '잠룡승천학원에서 계약서 서명을 요청했습니다. 아래 버튼을 눌러 서명을 진행해 주세요.',
            imageUrl: kakaoLogoUrl,
            link: {
              webUrl: signUrl,
              mobileWebUrl: signUrl,
            },
          },
          buttons: [
            {
              title: '서명하러 가기',
              link: {
                webUrl: signUrl,
                mobileWebUrl: signUrl,
              },
            },
          ],
        });
        return;
      }
    } catch (error) {
      console.warn('카카오 공유 실패:', error);
    }

    try {
      await navigator.clipboard.writeText(signUrl);
      alert('카톡 전송 대신 링크가 복사되었습니다.');
    } catch (error) {
      console.error('서명 링크 복사 실패:', error);
      alert('링크 복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold text-navy mb-4">계약서 작성 완료!</h1>
      
      {saving && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700">계약서를 저장하는 중...</p>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-semibold">✓ 계약서가 저장되었습니다</p>
        </div>
      )}

      {saveError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{saveError}</p>
        </div>
      )}

      <p className="text-gray-600 mb-8">
        강사근로계약서가 성공적으로 생성되었습니다.<br/>
        계약서를 인쇄하거나 저장하여 사용하세요.
      </p>

      <div className="space-y-4">
        {saveSuccess && (
          <>
            {saveSuccess && isPartnerFlow && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                {partnerCallbackDone && (
                  <p className="text-green-700 font-semibold mb-3">✓ 계약서가 파트너 프로그램에 전달되었습니다</p>
                )}
                {partnerReturnUrl && (
                  <button
                    onClick={() => {
                      window.location.href = partnerReturnUrl + '?contract_id=' + (contractId || '') + '&status=COMPLETED';
                    }}
                    className="w-full px-6 py-3 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-lg font-semibold transition-colors"
                  >
                    파트너 프로그램으로 돌아가기
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopySignLink}
                className="w-full sm:flex-1 px-6 py-3 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                disabled={!contractId}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 3C6.936 3 3 6.356 3 10.5c0 2.49 1.575 4.708 4.05 6.042l-1.02 3.42a.75.75 0 0 0 1.132.84l3.96-2.64c.293.03.592.048.898.048 5.064 0 9-3.356 9-7.5S17.064 3 12 3z" />
                </svg>
                서명 요청 링크 복사하기
              </button>
              <div className="w-full sm:flex-1 flex flex-col gap-1">
                <button
                  onClick={handleKakaoSignRequest}
                  className="w-full px-6 py-3 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!contractId || !kakaoReady}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 3C6.936 3 3 6.356 3 10.5c0 2.49 1.575 4.708 4.05 6.042l-1.02 3.42a.75.75 0 0 0 1.132.84l3.96-2.64c.293.03.592.048.898.048 5.064 0 9-3.356 9-7.5S17.064 3 12 3z" />
                  </svg>
                  카톡으로 서명 요청
                </button>
                {!kakaoReady && (
                  <span className="text-[11px] text-gray-500 text-left sm:text-center">
                    {kakaoDisabledReason}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
            >
              대시보드로 돌아가기
            </button>
          </>
        )}
        
        <button
          onClick={() => router.push('/wizard/type-a/preview')}
          className="w-full px-6 py-3 bg-navy text-white rounded-lg hover:bg-navy/90"
        >
          계약서 다시 보기
        </button>
        
        <button
          onClick={() => window.print()}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          계약서 인쇄
        </button>
        
        <button
          onClick={handleNewContract}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          새 계약서 작성
        </button>
        
        <button
          onClick={() => router.push('/')}
          className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
