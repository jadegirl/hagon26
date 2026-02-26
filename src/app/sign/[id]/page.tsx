'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/lib/supabase';
import ContractDocument from '@/components/contracts/ContractDocument';
import type { Salary } from '@/types/wizard';

type ContractData = {
  academy?: { name?: string; address?: string; representative?: string; phone?: string };
  instructor?: { name?: string; phone?: string; address?: string; subject?: string };
  contractPeriod?: { startDate?: string; endDate?: string };
  workCondition?: { weeklyHours?: number; workDays?: number; weeklyHoliday?: string };
  salary?: Partial<Salary>;
  protection?: { hasNonCompete?: boolean; nonCompetePeriod?: number; nonCompeteRadius?: number };
  specialTerms?: string;
  signature_image_url?: string;
};

type ContractRecord = {
  id: string;
  contract_data: ContractData;
  status: string;
};

export default function SignPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contractId = params?.id;

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [verified, setVerified] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [scrollHintVisible, setScrollHintVisible] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const sigPadRef = useRef<SignatureCanvas>(null);
  const contractScrollRef = useRef<HTMLDivElement>(null);

  const instructorName = contract?.contract_data.instructor?.name || '';
  const instructorPhone = contract?.contract_data.instructor?.phone || '';
  const stampImageUrl = contract?.contract_data.signature_image_url || '';

  const normalizedName = useMemo(
    () => name.replace(/[\s-]/g, '').toLowerCase(),
    [name]
  );
  const normalizedInstructorName = useMemo(
    () => instructorName.replace(/[\s-]/g, '').toLowerCase(),
    [instructorName]
  );
  const normalizedPhone = useMemo(
    () => phone.replace(/\D/g, ''),
    [phone]
  );
  const normalizedInstructorPhone = useMemo(
    () => instructorPhone.replace(/\D/g, ''),
    [instructorPhone]
  );

  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('contracts')
          .select('id, contract_data, status')
          .eq('id', contractId)
          .single();

        if (fetchError || !data) {
          console.error('계약서 조회 실패:', fetchError);
          throw new Error(fetchError?.message || '계약서 정보를 찾을 수 없습니다.');
        }

        setContract(data as ContractRecord);
      } catch (err: any) {
        console.error('계약서 로딩 오류:', err);
        if (typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('hagon-wizard-storage');
            if (stored) {
              const parsed = JSON.parse(stored);
              const state = parsed.state || parsed;
              if (state?.academy || state?.instructor) {
                const fallbackContract: ContractRecord = {
                  id: contractId,
                  status: 'draft',
                  contract_data: {
                    academy: state.academy,
                    instructor: state.instructor,
                    contractPeriod: state.contractPeriod,
                    workCondition: state.workCondition,
                    salary: state.salary,
                    protection: state.protection,
                    specialTerms: state.specialTerms,
                  },
                };
                console.warn('Supabase 미연결로 localStorage 계약 데이터를 사용합니다.');
                setContract(fallbackContract);
                return;
              }
            }
          } catch (storageError) {
            console.error('localStorage 계약 데이터 파싱 실패:', storageError);
          }
        }
        setError(err.message || '계약서 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  useEffect(() => {
    if (!verified) return;
    setHasScrolledToEnd(false);
    setScrollHintVisible(true);
    const target = contractScrollRef.current;
    if (target) {
      target.scrollTop = 0;
      if (target.scrollHeight <= target.clientHeight) {
        setHasScrolledToEnd(true);
        setScrollHintVisible(false);
      }
    }
  }, [verified, contractId, contract?.contract_data]);

  useEffect(() => {
    if (!verified) return;
    setHasScrolledToEnd(false);
    setScrollHintVisible(true);
    if (contractScrollRef.current) {
      contractScrollRef.current.scrollTop = 0;
    }
  }, [verified, contractId]);

  const handleVerify = async () => {
    if (!contract) return;
    if (!name.trim() || !normalizedPhone) {
      alert('성명과 휴대폰 번호를 입력해주세요.');
      return;
    }

    if (normalizedName !== normalizedInstructorName || normalizedPhone !== normalizedInstructorPhone) {
      console.error('입력값 불일치:', {
        inputName: normalizedName,
        contractName: normalizedInstructorName,
        inputPhone: normalizedPhone,
        contractPhone: normalizedInstructorPhone,
      });
      alert('입력 정보가 계약서 정보와 일치하지 않습니다.');
      return;
    }

    setVerified(true);
  };

  const handleClearSignature = () => {
    sigPadRef.current?.clear();
  };

  const handleSubmitSignature = async () => {
    if (!contract || !contractId) return;
    if (!consent) {
      alert('계약 내용 동의에 체크해주세요.');
      return;
    }
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert('서명을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const signatureDataUrl = sigPadRef.current.toDataURL('image/png');
      const token = crypto.randomUUID();
      const response = await fetch('/api/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: contractId,
          token,
          signatureData: {
            name: name.trim(),
            phone: normalizedPhone,
            dataUrl: signatureDataUrl,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || '서명 저장에 실패했습니다.');
      }

      setToast({ type: 'success', message: '서명이 저장되었습니다.' });
      setTimeout(() => router.push(`/sign/${contractId}/success`), 600);
    } catch (err: any) {
      console.error('서명 저장 오류:', err);
      setToast({ type: 'error', message: err?.message || '서명 저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const contractSummary = contract ? (
    <ContractDocument
      className="space-y-6 text-[13px] leading-relaxed text-gray-800"
      data={contract.contract_data}
      stampUrl={stampImageUrl || undefined}
      showSignatureSection={false}
      showAnnex
    />
  ) : null;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  }

  if (error || !contract) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error || '계약서를 찾을 수 없습니다.'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 space-y-6">
        {toast && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-navy">전자 서명</h1>
          <p className="text-sm text-gray-500 mt-2">강사 전용 계약서 서명 페이지</p>
        </div>

        {contract.status === 'signed' ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold text-gray-900">이미 체결된 계약서입니다</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              본 계약서는 이미 서명이 완료되어 체결되었습니다.
              <br />
              아래 버튼을 눌러 체결된 계약서를 확인하실 수 있습니다.
            </p>
            <a
              href={`/view/${contractId}`}
              className="block w-full px-6 py-3 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-xl font-semibold transition-colors"
            >
              체결된 계약서 보기
            </a>
          </div>
        ) : !verified ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">성명</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm"
                placeholder="성명을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">휴대폰 번호</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm"
                placeholder="휴대폰 번호를 입력하세요"
              />
            </div>
            <button
              onClick={handleVerify}
              className="w-full px-6 py-4 bg-navy text-white rounded-xl font-semibold text-base"
            >
              정보 확인하기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div
                ref={contractScrollRef}
                className="h-[65vh] overflow-y-auto pr-2"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const reachedEnd =
                    target.scrollTop + target.clientHeight >= target.scrollHeight - 4;
                  setHasScrolledToEnd(reachedEnd);
                  if (reachedEnd) {
                    setScrollHintVisible(false);
                  }
                }}
              >
                {contractSummary}
              </div>
              {scrollHintVisible && (
                <p className="mt-2 text-xs text-gray-500">
                  계약서 전문을 끝까지 스크롤한 후 서명할 수 있습니다.
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={!hasScrolledToEnd}
              />
              계약서 전문을 모두 확인하였습니다
            </label>

            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <SignatureCanvas
                  ref={sigPadRef}
                  penColor="#111827"
                  canvasProps={{ className: 'w-full h-40 rounded-lg border border-gray-200' }}
                />
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="mt-3 text-sm text-gray-500 underline"
                >
                  서명 지우기
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmitSignature}
              disabled={saving || !consent || !hasScrolledToEnd}
              className="w-full px-6 py-4 bg-navy text-white rounded-xl font-semibold text-base disabled:opacity-50"
            >
              {saving ? '서명 저장 중...' : '서명 완료'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

