'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useWizardStore } from '@/lib/wizard-store';
import { supabase } from '@/lib/supabase';
import ContractDocument from '@/components/contracts/ContractDocument';
import ProgressBar from '@/components/wizard/ProgressBar';
import {
  calculateMinWage,
  calculateWeeklyHolidayHours,
} from '@/lib/calculations';
import {
  calcFixedOrdinarySplit,
  calcFixedTotalMonthlyPayFromBase,
  calcPercentageMinimumGuarantee,
  getOrdinaryHoursForRecalc,
} from '@/lib/calculations/wage';
import { LEGAL_STANDARDS } from '@/constants/legalStandards';

// ─── 타입 정의 ───────────────────────────────────────

type TabType = 'summary' | 'preview';

/** 카카오 SDK 최소 타입 */
interface KakaoSDK {
  init: (key: string) => void;
  isInitialized?: () => boolean;
  Share: {
    sendDefault: (options: {
      objectType: string;
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: { webUrl: string; mobileWebUrl: string };
      };
      buttons: Array<{
        title: string;
        link: { webUrl: string; mobileWebUrl: string };
      }>;
    }) => void;
  };
}

/** jsPDF 문서 최소 타입 (html2pdf 콜백용) */
interface JsPDFDocument {
  internal: {
    getNumberOfPages: () => number;
    pageSize: { getWidth: () => number; getHeight: () => number };
  };
  setPage: (page: number) => void;
  setFontSize: (size: number) => void;
  text: (text: string, x: number, y: number, options?: { align?: string }) => void;
}

/** html2pdf 워커 최소 타입 */
interface Html2PdfWorker {
  set: (opt: Record<string, unknown>) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  toPdf: () => Html2PdfWorker;
  get: (type: string) => Html2PdfWorker;
  then: (callback: (doc: JsPDFDocument) => void) => Html2PdfWorker;
  save: () => void;
}

// ─── 헬퍼 ─────────────────────────────────────────────

/** 이미지 로딩 대기 (PDF 생성 전) */
const waitForImages = async (container: Element) => {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return;
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
};

// ─── 페이지 컴포넌트 ──────────────────────────────────

export default function Step5Page() {
  const router = useRouter();
  const { reset, clearStorage, ...wizardData } = useWizardStore();
  const {
    academy, instructor, contractPeriod, workCondition,
    salary, protection, specialTerms, signatureImageUrl, calculated,
  } = wizardData;

  // 탭
  const [tab, setTab] = useState<TabType>('summary');

  // 저장 상태
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  // 카카오 SDK
  const [kakaoReady, setKakaoReady] = useState(false);
  const [kakaoDisabledReason, setKakaoDisabledReason] = useState('SDK 미로딩');
  const kakaoLogoUrl = 'https://hagon-cloud.vercel.app/logo.png';
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

  // 파트너 플로우
  const [isPartnerFlow, setIsPartnerFlow] = useState(false);
  const [partnerReturnUrl, setPartnerReturnUrl] = useState<string | null>(null);
  const [partnerCallbackDone, setPartnerCallbackDone] = useState(false);

  // ─── 요약 탭: 급여 계산 (step-8 로직) ─────────────────

  const formatCurrency = (value: number) => value.toLocaleString('ko-KR');

  const weeklyHours = workCondition.weeklyHours || calculated.weeklyHours || 0;
  const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyHours);

  const percentageMinimum = calcPercentageMinimumGuarantee({
    weeklyHours,
    weeklyHolidayHours,
    minHourlyWage: LEGAL_STANDARDS.MIN_HOURLY_WAGE,
    baseSalary: salary.percentageBaseSalary || 0,
    meal: salary.mealAllowance || 0,
    transport: salary.transportAllowance || 0,
    position: salary.positionAllowance || 0,
    other: salary.otherAllowance || 0,
  });
  const weeklyPaidHours = percentageMinimum.weeklyPaidHours;
  const monthlyPaidHours = percentageMinimum.monthlyPaidHours;

  const { monthlyOrdinaryWorkHours, monthlyHolidayHours, totalOrdinaryPaidHours } =
    getOrdinaryHoursForRecalc(weeklyHours, weeklyHolidayHours);

  const minWageTotal =
    salary.type === 'PERCENTAGE'
      ? percentageMinimum.minMonthlyWage
      : calculateMinWage(weeklyHours);

  /** 고정급 총 급여 / 퍼센트급 총 급여 / 시급제 총 급여 계산 */
  const getTotalSalary = () => {
    if (salary.type === 'FIXED') {
      const weeklyHolidayPay = getFixedWeeklyHolidayPay();
      return salary.baseSalary + weeklyHolidayPay + salary.mealAllowance + salary.transportAllowance +
             salary.positionAllowance + salary.otherAllowance + salary.overtimeAllowance +
             (protection.hasNonCompete ? protection.nonCompeteCompensation : 0);
    }
    if (salary.type === 'PERCENTAGE') {
      const minGuarantee = percentageMinimum.minGuarantee;
      const separatePay = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
      const percentageResult = salary.minGuarantee || 0;
      return Math.max(percentageResult, minGuarantee) + separatePay + (salary.overtimeAllowance || 0);
    }
    if (salary.type === 'HOURLY') {
      const monthlyBase = Math.round(salary.hourlyWage * weeklyHours * LEGAL_STANDARDS.WEEKS_PER_MONTH);
      const holidayPay = weeklyHours >= 15
        ? Math.round(salary.hourlyWage * weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH)
        : 0;
      return monthlyBase + holidayPay + salary.mealAllowance + salary.transportAllowance +
             salary.positionAllowance + salary.otherAllowance + salary.overtimeAllowance;
    }
    return 0;
  };

  /** 고정급용 주휴수당 계산 */
  const getFixedWeeklyHolidayPay = () => {
    if (salary.type !== 'FIXED') return 0;
    const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
    const totalMonthlyPay = calcFixedTotalMonthlyPayFromBase({
      baseSalary: salary.baseSalary,
      weeklyHours,
      weeklyHolidayHours,
      meal: salary.mealAllowance,
      transport: salary.transportAllowance,
      position: salary.positionAllowance,
      other: salary.otherAllowance,
      overtime: salary.overtimeAllowance,
      nonCompete,
    });
    const split = calcFixedOrdinarySplit({
      totalMonthlyPay,
      weeklyHours,
      weeklyHolidayHours,
      meal: salary.mealAllowance,
      transport: salary.transportAllowance,
      position: salary.positionAllowance,
      other: salary.otherAllowance,
      overtime: salary.overtimeAllowance,
      nonCompete,
    });
    return split.holidayPay;
  };

  // ─── 미리보기 탭: 계약서 데이터 (wizard store만) ──────

  const contractData = useMemo(() => ({
    academy,
    instructor,
    contractPeriod,
    workCondition,
    salary,
    protection,
    specialTerms,
    signature_image_url: signatureImageUrl,
  }), [academy, instructor, contractPeriod, workCondition, salary, protection, specialTerms, signatureImageUrl]);

  const normalizedContractData = useMemo(() => {
    if (!contractData) return contractData;
    const currentWorkCondition = contractData.workCondition || {};
    const wh = currentWorkCondition.weeklyHours || calculated.weeklyHours || 0;
    return {
      ...contractData,
      workCondition: { ...currentWorkCondition, weeklyHours: wh },
    };
  }, [contractData, calculated.weeklyHours]);

  const resolvedStampUrl = signatureImageUrl || null;

  const getPdfFileName = () => {
    const academyName = normalizedContractData?.academy?.name || '학원';
    const instructorName = normalizedContractData?.instructor?.name || '강사';
    const raw = `${academyName}_${instructorName}_계약서.pdf`;
    return raw.replace(/[\\/:*?"<>|]/g, '_');
  };

  /** PDF 다운로드 — 미리보기 탭의 ContractDocument를 캡처 */
  const handleDownloadPDF = async () => {
    if (typeof window === 'undefined') return;

    // 미리보기 탭이 아닌 경우 전환 후 렌더링 대기
    if (tab !== 'preview') {
      setTab('preview');
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const element = document.querySelector('.contract-preview-root');
    if (!element) return;

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default as unknown as () => Html2PdfWorker;

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await waitForImages(element);

      const opt = {
        margin: [18, 18, 18, 18] as [number, number, number, number],
        filename: getPdfFileName(),
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          ignoreElements: (el: Element) =>
            !!(el.classList?.contains('no-print') || el.classList?.contains('print-hide')),
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'p'] },
      };

      const worker = html2pdf()
        .set(opt as unknown as Record<string, unknown>)
        .from(element as HTMLElement);

      await worker
        .toPdf()
        .get('pdf')
        .then((pdf: JsPDFDocument) => {
          const totalPages = pdf.internal.getNumberOfPages();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          for (let i = 1; i <= totalPages; i += 1) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.text(`${i} / ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
          }
        });

      worker.save();
    } catch (error) {
      console.error('PDF 생성 중 오류가 발생했습니다:', error);
    }
  };

  // ─── 카카오 SDK 초기화 ────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let attempts = 0;
    const checkReady = () => {
      const kakao = (window as unknown as { Kakao?: KakaoSDK }).Kakao;
      if (kakao) {
        if (!kakao.isInitialized?.() && kakaoKey) {
          try {
            kakao.init(kakaoKey);
          } catch (initError) {
            console.warn('Kakao SDK 초기화 실패:', initError);
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

  // ─── 계약서 저장 (버튼 클릭 시) ────────────────────────

  const handleSaveContract = async () => {
    try {
      setSaving(true);
      setSaveError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('로그인이 필요합니다.');
      }

      let stampImageUrl = signatureImageUrl || '';
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
      const contractPayload = {
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

      const existingDraftId = wizardData.draftId;
      const existingStatus = wizardData.sourceContractStatus;
      let savedContractId: string | null = null;

      // signed/pending_signature 상태는 업데이트하지 않고 새로 생성
      if (existingDraftId && existingStatus !== 'signed' && existingStatus !== 'pending_signature') {
        const { data: updatedContract, error: updateError } = await supabase
          .from('contracts')
          .update({
            contract_data: contractPayload,
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
            contract_data: contractPayload,
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
      }

      // 저장 성공 시 localStorage 삭제 (zustand 메모리는 유지)
      clearStorage();

      // ── 파트너 콜백 처리 ──
      try {
        const partnerSessionRaw = typeof window !== 'undefined'
          ? sessionStorage.getItem('hagon-partner-session')
          : null;

        if (partnerSessionRaw) {
          const partnerSession = JSON.parse(partnerSessionRaw) as {
            session_token: string;
            return_url?: string;
          };
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

      setSaveSuccess(true);
    } catch (error: unknown) {
      console.error('계약서 저장 오류:', error);
      const message = error instanceof Error ? error.message : '계약서 저장에 실패했습니다.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  // ─── 기타 핸들러 ──────────────────────────────────────

  const handleNewContract = () => {
    reset();
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
    const kakao = (window as unknown as { Kakao?: KakaoSDK }).Kakao;

    try {
      if (kakao && !kakao.isInitialized?.() && kakaoKey) {
        kakao.init(kakaoKey);
      }
      if (kakao?.isInitialized?.()) {
        kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '[학온] 계약서 서명 요청',
            description: `${academy.name || '학원'}에서 계약서 서명을 요청했습니다. 아래 버튼을 눌러 서명을 진행해 주세요.`,
            imageUrl: kakaoLogoUrl,
            link: { webUrl: signUrl, mobileWebUrl: signUrl },
          },
          buttons: [
            {
              title: '서명하러 가기',
              link: { webUrl: signUrl, mobileWebUrl: signUrl },
            },
          ],
        });
        return;
      }
    } catch (shareError) {
      console.warn('카카오 공유 실패:', shareError);
    }

    try {
      await navigator.clipboard.writeText(signUrl);
      alert('카톡 전송 대신 링크가 복사되었습니다.');
    } catch (error) {
      console.error('서명 링크 복사 실패:', error);
      alert('링크 복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // ─── JSX ──────────────────────────────────────────────

  return (
    <>
      <ProgressBar currentStep={5} />

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12pt; }
          .print-page { page-break-after: auto; }
        }
      `}</style>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-navy dark:text-blue-300 mb-2">계약서 검토 및 완료</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">계약 내용을 확인하고 저장하세요.</p>

        {/* ── 탭 바 ── */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            type="button"
            onClick={() => setTab('summary')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              tab === 'summary'
                ? 'border-navy text-navy dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📋 요약
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              tab === 'preview'
                ? 'border-navy text-navy dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📄 미리보기
          </button>
        </div>

        {/* ── 탭 A: 요약 ── */}
        {tab === 'summary' && (
          <div className="space-y-6">

            {/* 강사 정보 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-navy dark:text-blue-300">강사 정보</h3>
                <button
                  type="button"
                  onClick={() => router.push('/wizard/type-a/step-1')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                >
                  ✏️ 수정
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div><span className="text-gray-500 dark:text-gray-400">이름:</span> {instructor.name}</div>
                <div><span className="text-gray-500 dark:text-gray-400">담당과목:</span> {instructor.subject}</div>
              </div>
            </div>

            {/* 학원 정보 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-navy dark:text-blue-300 mb-2">학원 정보</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div><span className="text-gray-500 dark:text-gray-400">학원명:</span> {academy.name}</div>
                <div><span className="text-gray-500 dark:text-gray-400">대표자:</span> {academy.representative}</div>
              </div>
            </div>

            {/* 계약 기간 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-navy dark:text-blue-300 mb-2">계약 기간</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{contractPeriod.startDate} ~ {contractPeriod.endDate}</p>
              {contractPeriod.probationMonths > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">수습기간: {contractPeriod.probationMonths}개월</p>
              )}
            </div>

            {/* 근무 조건 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-navy dark:text-blue-300">근무 조건</h3>
                <button
                  type="button"
                  onClick={() => router.push('/wizard/type-a/step-2')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                >
                  ✏️ 수정
                </button>
              </div>
              <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <p>주당 근무시간: {weeklyHours}시간</p>
                {salary.type === 'PERCENTAGE' ? (
                  <>
                    <p>주 유급시간(실근로+주휴): {weeklyPaidHours.toFixed(1)}시간</p>
                    <p>월 유급시간(환산): {monthlyPaidHours.toFixed(2)}시간</p>
                    <p>최저월급(유급시간 기준): {formatCurrency(minWageTotal)}원</p>
                  </>
                ) : (
                  <p>
                    월 통상시간: {totalOrdinaryPaidHours.toFixed(1)}시간
                    (소정 {monthlyOrdinaryWorkHours.toFixed(1)} + 주휴 {monthlyHolidayHours.toFixed(1)})
                  </p>
                )}
              </div>
            </div>

            {/* 급여 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-navy dark:text-blue-300">💰 급여 내역</h3>
                <button
                  type="button"
                  onClick={() => router.push('/wizard/type-a/step-3')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                >
                  ✏️ 수정
                </button>
              </div>
              <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">

                {/* 고정급 */}
                {salary.type === 'FIXED' && (
                  <>
                    <div className="flex justify-between">
                      <span>기본급</span>
                      <span>{formatCurrency(salary.baseSalary)}원</span>
                    </div>
                    {getFixedWeeklyHolidayPay() > 0 && (
                      <div className="flex justify-between">
                        <span>주휴수당</span>
                        <span>{formatCurrency(getFixedWeeklyHolidayPay())}원</span>
                      </div>
                    )}
                  </>
                )}

                {/* 퍼센트급 */}
                {salary.type === 'PERCENTAGE' && (
                  <>
                    {(() => {
                      const 주휴수당 = percentageMinimum.weeklyHolidayPay;
                      const 최소보장금액 = percentageMinimum.minGuarantee + (salary.overtimeAllowance || 0);
                      const 별도지급소계 = protection.hasNonCompete ? protection.nonCompeteCompensation : 0;
                      const 매출기준금액 = salary.minGuarantee || 0;
                      const 총지급액 = Math.max(매출기준금액, 최소보장금액) + 별도지급소계;

                      return (
                        <>
                          {/* 급여 산정 방식 */}
                          <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-700">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📌 급여 산정 방식</p>
                            <div className="flex items-center justify-center gap-3">
                              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-300 dark:border-blue-600 text-center">
                                <p className="text-xs text-gray-500 dark:text-gray-400">매출 기준</p>
                                <p className="font-bold text-blue-800 dark:text-blue-300">매출 × {salary.revenueRatio}%</p>
                              </div>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">VS</span>
                              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-300 dark:border-blue-600 text-center">
                                <p className="text-xs text-gray-500 dark:text-gray-400">최소 보장</p>
                                <p className="font-bold text-blue-800 dark:text-blue-300">{formatCurrency(최소보장금액)}원</p>
                              </div>
                            </div>
                            <p className="text-center mt-2 text-sm text-blue-700 dark:text-blue-300">
                              👉 <strong>둘 중 큰 금액</strong>을 매월 지급합니다.
                            </p>
                          </div>

                          {/* 최소 보장 금액 상세 */}
                          <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🛡️ 최소 보장 금액</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-600 dark:text-gray-400">기본급</span>
                                <span>{formatCurrency(salary.percentageBaseSalary || 0)}원</span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-gray-600 dark:text-gray-400">주휴수당</span>
                                <span>{formatCurrency(주휴수당)}원</span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-gray-600 dark:text-gray-400">식대 <span className="text-green-600 dark:text-green-400 text-xs">(비과세)</span></span>
                                <span>{formatCurrency(salary.mealAllowance)}원</span>
                              </div>
                              {salary.transportAllowance > 0 && (
                                <div className="flex justify-between py-1">
                                  <span className="text-gray-600 dark:text-gray-400">자가운전보조금 <span className="text-green-600 dark:text-green-400 text-xs">(비과세)</span></span>
                                  <span>{formatCurrency(salary.transportAllowance)}원</span>
                                </div>
                              )}
                              {(salary.overtimeAllowance || 0) > 0 && (
                                <div className="flex justify-between py-1">
                                  <span className="text-red-600 dark:text-red-400">연장근로수당</span>
                                  <span className="text-red-600 dark:text-red-400">{formatCurrency(salary.overtimeAllowance)}원</span>
                                </div>
                              )}
                              {salary.positionAllowance > 0 && (
                                <div className="flex justify-between py-1">
                                  <span className="text-gray-600 dark:text-gray-400">직책수당</span>
                                  <span>{formatCurrency(salary.positionAllowance)}원</span>
                                </div>
                              )}
                              {salary.otherAllowance > 0 && (
                                <div className="flex justify-between py-1">
                                  <span className="text-gray-600 dark:text-gray-400">기타수당 {salary.otherAllowanceMemo && `(${salary.otherAllowanceMemo})`}</span>
                                  <span>{formatCurrency(salary.otherAllowance)}원</span>
                                </div>
                              )}
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                              <div className="flex justify-between font-semibold text-blue-800 dark:text-blue-300">
                                <span>최소 보장 금액</span>
                                <span>{formatCurrency(최소보장금액)}원</span>
                              </div>
                            </div>
                          </div>

                          {/* 별도 지급 항목 */}
                          {(protection.hasNonCompete && protection.nonCompeteCompensation > 0) && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">📋 별도 지급 항목</p>
                              <div className="space-y-1 text-sm">
                                {protection.hasNonCompete && protection.nonCompeteCompensation > 0 && (
                                  <div className="flex justify-between py-1">
                                    <span className="text-amber-700 dark:text-amber-300">경업금지약정대가</span>
                                    <span className="text-amber-800 dark:text-amber-200">{formatCurrency(protection.nonCompeteCompensation)}원</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 월 총 지급액 */}
                          <div className="p-3 bg-navy dark:bg-blue-800 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white">월 총 지급액 (세전)</span>
                              <span className="font-bold text-white text-xl">{formatCurrency(총지급액)}원</span>
                            </div>
                            <p className="text-xs text-blue-200 dark:text-blue-300 mt-1 text-right">
                              매출 기준과 최소 보장 중 큰 금액 + 별도 지급
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}

                {/* 시급제 */}
                {salary.type === 'HOURLY' && (
                  <>
                    <div className="flex justify-between">
                      <span>시급</span>
                      <span>{formatCurrency(salary.hourlyWage)}원</span>
                    </div>
                    {weeklyHours > 0 && (
                      <div className="flex justify-between">
                        <span>기본급 ({formatCurrency(salary.hourlyWage)}원 × {weeklyHours}시간 × 4.345주)</span>
                        <span>{formatCurrency(Math.round(salary.hourlyWage * weeklyHours * LEGAL_STANDARDS.WEEKS_PER_MONTH))}원</span>
                      </div>
                    )}
                    {weeklyHours >= 15 && (
                      <div className="flex justify-between">
                        <span>주휴수당 ({formatCurrency(salary.hourlyWage)}원 × {weeklyHolidayHours.toFixed(1)}시간 × 4.345주)</span>
                        <span>{formatCurrency(Math.round(salary.hourlyWage * weeklyHolidayHours * LEGAL_STANDARDS.WEEKS_PER_MONTH))}원</span>
                      </div>
                    )}
                  </>
                )}

                {/* 고정급/시급 공통 비과세 수당 */}
                {salary.type !== 'PERCENTAGE' && salary.mealAllowance > 0 && (
                  <div className="flex justify-between">
                    <span>식대 <span className="text-green-600 dark:text-green-400">(비과세)</span></span>
                    <span>{formatCurrency(salary.mealAllowance)}원</span>
                  </div>
                )}
                {salary.type !== 'PERCENTAGE' && salary.overtimeAllowance > 0 && (
                  <div className="flex justify-between text-red-700 dark:text-red-400">
                    <span>연장근로수당</span>
                    <span>{formatCurrency(salary.overtimeAllowance)}원</span>
                  </div>
                )}
                {salary.transportAllowance > 0 && (
                  <div className="flex justify-between">
                    <span>자가운전보조금 <span className="text-green-600 dark:text-green-400">(비과세)</span></span>
                    <span>{formatCurrency(salary.transportAllowance)}원</span>
                  </div>
                )}

                {/* 고정급/시급 별도 지급 항목 */}
                {salary.type !== 'PERCENTAGE' && ((protection.hasNonCompete && protection.nonCompeteCompensation > 0) || salary.positionAllowance > 0 || salary.otherAllowance > 0) && (
                  <>
                    <div className="flex justify-between font-semibold text-amber-700 dark:text-amber-400 mt-3">
                      <span>📋 별도 지급 항목</span>
                    </div>
                    {salary.positionAllowance > 0 && (
                      <div className="flex justify-between pl-4 text-amber-700 dark:text-amber-400">
                        <span>직책수당</span>
                        <span>{formatCurrency(salary.positionAllowance)}원</span>
                      </div>
                    )}
                    {salary.otherAllowance > 0 && (
                      <div className="flex justify-between pl-4 text-amber-700 dark:text-amber-400">
                        <span>기타수당{salary.otherAllowanceMemo ? ` (${salary.otherAllowanceMemo})` : ''}</span>
                        <span>{formatCurrency(salary.otherAllowance)}원</span>
                      </div>
                    )}
                    {protection.hasNonCompete && protection.nonCompeteCompensation > 0 && (
                      <div className="flex justify-between pl-4 text-amber-700 dark:text-amber-400">
                        <span>경업금지약정대가</span>
                        <span>{formatCurrency(protection.nonCompeteCompensation)}원</span>
                      </div>
                    )}
                  </>
                )}

                {/* 월 총 지급액 (고정급/시급) */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 font-semibold flex justify-between">
                  <span>월 총 지급액 (세전)</span>
                  <span className="text-navy dark:text-blue-300">{formatCurrency(getTotalSalary())}원</span>
                </div>

              </div>
            </div>

            {/* 경업금지 */}
            {protection.hasNonCompete && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <h3 className="font-semibold text-navy dark:text-blue-300 mb-2">🔒 경업금지약정</h3>
                <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <p>기간: {protection.nonCompetePeriod}개월</p>
                  <p>범위: 학원으로부터 반경 {protection.nonCompeteRadius}km</p>
                  <p>대가: 월 {formatCurrency(protection.nonCompeteCompensation)}원</p>
                </div>
              </div>
            )}

            {/* 특약사항 */}
            {specialTerms && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-navy dark:text-blue-300">특약사항</h3>
                  <button
                    type="button"
                    onClick={() => router.push('/wizard/type-a/step-4')}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                  >
                    ✏️ 수정
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{specialTerms}</p>
              </div>
            )}

          </div>
        )}

        {/* ── 탭 B: 미리보기 ── */}
        {tab === 'preview' && (
          <div className="bg-white dark:bg-gray-800 max-w-4xl mx-auto px-12 py-8 font-serif contract-preview-root rounded-lg">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-navy dark:text-blue-300 mb-2">강사근로계약서</h2>
              <p className="text-base text-gray-500 dark:text-gray-400 tracking-wide">Employment Contract</p>
            </div>

            <ContractDocument
              className="prose max-w-none text-[10pt] leading-relaxed text-gray-800 dark:text-gray-200 space-y-6 contract-body"
              data={normalizedContractData || {}}
              stampUrl={resolvedStampUrl || undefined}
              showSignatureSection
              showAnnex
            />
          </div>
        )}

        {/* ── 하단 액션 ── */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">

          {/* 상태 메시지 */}
          {saving && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300">계약서를 저장하는 중...</p>
            </div>
          )}

          {saveSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 font-semibold">✓ 계약서가 저장되었습니다</p>
            </div>
          )}

          {saveError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">{saveError}</p>
            </div>
          )}

          {/* 파트너 플로우 */}
          {saveSuccess && isPartnerFlow && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              {partnerCallbackDone && (
                <p className="text-green-700 dark:text-green-300 font-semibold mb-3">✓ 계약서가 파트너 프로그램에 전달되었습니다</p>
              )}
              {partnerReturnUrl && (
                <button
                  type="button"
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

          {/* 저장 후 서명 요청 버튼들 */}
          {saveSuccess && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCopySignLink}
                  className="w-full sm:flex-1 px-6 py-3 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  disabled={!contractId}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 3C6.936 3 3 6.356 3 10.5c0 2.49 1.575 4.708 4.05 6.042l-1.02 3.42a.75.75 0 0 0 1.132.84l3.96-2.64c.293.03.592.048.898.048 5.064 0 9-3.356 9-7.5S17.064 3 12 3z" />
                  </svg>
                  서명 요청 링크 복사하기
                </button>
                <div className="w-full sm:flex-1 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handleKakaoSignRequest}
                    className="w-full px-6 py-3 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={!contractId || !kakaoReady}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 3C6.936 3 3 6.356 3 10.5c0 2.49 1.575 4.708 4.05 6.042l-1.02 3.42a.75.75 0 0 0 1.132.84l3.96-2.64c.293.03.592.048.898.048 5.064 0 9-3.356 9-7.5S17.064 3 12 3z" />
                    </svg>
                    카톡으로 서명 요청
                  </button>
                  {!kakaoReady && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 text-left sm:text-center">
                      {kakaoDisabledReason}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 메인 액션 버튼 행 */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => router.push('/wizard/type-a/step-4')}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              이전
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4m-8 8h8" />
                </svg>
                PDF 다운로드
              </button>

              {!saveSuccess && (
                <button
                  type="button"
                  onClick={handleSaveContract}
                  disabled={saving}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    saving
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-navy dark:bg-blue-700 text-white hover:bg-navy/90 dark:hover:bg-blue-600'
                  }`}
                >
                  {saving ? '저장 중...' : '💾 계약서 저장'}
                </button>
              )}
            </div>
          </div>

          {/* 저장 후 네비게이션 */}
          {saveSuccess && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                대시보드로 돌아가기
              </button>
              <button
                type="button"
                onClick={handleNewContract}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold transition-colors"
              >
                새 계약서 작성
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
