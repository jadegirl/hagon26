'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useWizardStore } from '@/lib/wizard-store';
import { supabase } from '@/lib/supabase';
import ContractDocument from '@/components/contracts/ContractDocument';

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
          const onLoad = () => resolve();
          const onError = () => resolve();
          img.addEventListener('load', onLoad, { once: true });
          img.addEventListener('error', onError, { once: true });
        })
    )
  );
};

export default function PreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('id');
  const { academy, instructor, contractPeriod, workCondition, salary, protection, specialTerms, signatureImageUrl, calculated } = useWizardStore();
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [remoteContractData, setRemoteContractData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contractId) return;
    const fetchContract = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('contract_data')
          .eq('id', contractId)
          .single();

        if (error) {
          console.warn('계약 데이터 조회 실패:', error);
          setRemoteContractData(null);
          return;
        }

        setRemoteContractData(data?.contract_data || null);
        const contractStampUrl = data?.contract_data?.signature_image_url || null;
        if (contractStampUrl) {
          setStampUrl(contractStampUrl);
          return;
        }

        const { data: stampData, error: stampError } = await supabase
          .from('signature_requests')
          .select('signature_image_url')
          .eq('contract_id', contractId)
          .single();

        if (!stampError) {
          setStampUrl(stampData?.signature_image_url || null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  useEffect(() => {
    if (contractId) return;
    if (signatureImageUrl) {
      setStampUrl(signatureImageUrl);
    }
  }, [contractId, signatureImageUrl]);

  const contractData = useMemo(() => {
    if (contractId) {
      return remoteContractData;
    }
    return { academy, instructor, contractPeriod, workCondition, salary, protection, specialTerms, signature_image_url: signatureImageUrl };
  }, [contractId, remoteContractData, academy, instructor, contractPeriod, workCondition, salary, protection, specialTerms, signatureImageUrl]);

  const normalizedContractData = useMemo(() => {
    if (!contractData) return contractData;
    const currentWorkCondition = contractData.workCondition || {};
    const weeklyHours = currentWorkCondition.weeklyHours || calculated.weeklyHours || 0;
    return {
      ...contractData,
      workCondition: {
        ...currentWorkCondition,
        weeklyHours,
      },
    };
  }, [contractData, calculated.weeklyHours]);

  const resolvedStampUrl = contractId
    ? (remoteContractData?.signature_image_url || stampUrl)
    : (stampUrl || signatureImageUrl);

  const getPdfFileName = () => {
    const academyName = normalizedContractData?.academy?.name || '학원';
    const instructorName = normalizedContractData?.instructor?.name || '강사';
    const raw = `${academyName}_${instructorName}_계약서.pdf`;
    return raw.replace(/[\\/:*?"<>|]/g, '_');
  };

  const handleDownloadPDF = async () => {
    if (typeof window === 'undefined') return;

    const element = document.querySelector('.contract-preview-root');
    if (!element) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;

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
            el.classList?.contains('no-print') || el.classList?.contains('print-hide'),
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'p'] },
      };

      const worker: any = html2pdf().set(opt).from(element as HTMLElement);

      await worker
        .toPdf()
        .get('pdf')
        .then((pdf: any) => {
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

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12pt; }
          .print-page { page-break-after: auto; }
        }
      `}</style>
      {contractId && loading ? (
        <div className="min-h-screen flex items-center justify-center">계약서를 불러오는 중...</div>
      ) : (
        <div className="bg-white max-w-4xl mx-auto px-12 py-8 font-serif contract-preview-root">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-navy mb-2">강사근로계약서</h1>
          <p className="text-base text-gray-500 tracking-wide">Employment Contract</p>
        </div>

        <ContractDocument
          className="prose max-w-none text-[10pt] leading-relaxed text-gray-800 space-y-6 contract-body"
          data={normalizedContractData || {}}
          stampUrl={resolvedStampUrl || undefined}
          showSignatureSection
          showAnnex
        />

        <div className="mt-8 flex justify-between no-print print-hide">
          <button
            onClick={() => router.push('/wizard/type-a/step-8')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors no-print"
          >
            이전
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 no-print"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4m-8 8h8" />
              </svg>
              PDF 다운로드
            </button>
            <button
              onClick={() => router.push('/wizard/type-a/complete')}
              className="px-6 py-3 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors no-print"
            >
              계약서 완료
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
}

