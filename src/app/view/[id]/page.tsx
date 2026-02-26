'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
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
            if ('decode' in img) {
              (img as HTMLImageElement)
                .decode()
                .then(() => resolve())
                .catch(() => resolve());
              return;
            }
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

const waitForDataRender = async (selector: string, timeoutMs = 3000) => {
  const start = Date.now();
  return new Promise<void>((resolve) => {
    const check = () => {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(check, 100);
    };
    check();
  });
};

const waitForTargetReady = async (element: HTMLElement, minText = 50, timeoutMs = 3000) => {
  const start = Date.now();
  return new Promise<void>((resolve) => {
    const check = () => {
      const textLength = element.innerText?.trim().length || 0;
      const rect = element.getBoundingClientRect();
      if (textLength >= minText && rect.height > 0) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(check, 100);
    };
    check();
  });
};

const nextFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

const submitPdfForm = (dataUrl: string, filename: string) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/pdf';
  form.target = '_blank';

  const dataInput = document.createElement('input');
  dataInput.type = 'hidden';
  dataInput.name = 'dataUrl';
  dataInput.value = dataUrl;
  form.appendChild(dataInput);

  const nameInput = document.createElement('input');
  nameInput.type = 'hidden';
  nameInput.name = 'filename';
  nameInput.value = filename;
  form.appendChild(nameInput);

  document.body.appendChild(form);
  form.submit();
  form.remove();
};

export default function ContractViewPage() {
  const params = useParams();
  const contractId = typeof params?.id === 'string' ? params.id : '';
  const viewRef = useRef<HTMLDivElement | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any | null>(null);
  const [showInAppGuide, setShowInAppGuide] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    if (!contractId) return;
    const fetchContract = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: contractError } = await supabase
          .from('contracts')
          .select('contract_data')
          .eq('id', contractId)
          .single();

        if (contractError || !data?.contract_data) {
          setError('계약서를 찾을 수 없습니다.');
          setContractData(null);
          return;
        }

        setContractData(data.contract_data);
      } catch (err) {
        console.error('계약서 조회 실패:', err);
        setError('계약서를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    const inApp =
      /KAKAOTALK|FBAN|FBAV|Instagram|Line|NAVER|DAUM|DaumApps|KAKAOSTORY/i.test(ua);
    setShowInAppGuide(inApp);
    setDebugEnabled(window.location.search.includes('debug=1'));
  }, []);

  const getPdfFileName = useMemo(() => {
    const academyName = contractData?.academy?.name || '학원';
    const instructorName = contractData?.instructor?.name || '강사';
    const raw = `${academyName}_${instructorName}_계약서.pdf`;
    return raw.replace(/[\\/:*?"<>|]/g, '_');
  }, [contractData]);

  const handleDownloadPDF = async () => {
    if (typeof window === 'undefined') return;
    if (loading || !contractData) {
      alert('계약서 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    const element = document.getElementById('pdf-root') as HTMLElement | null;
    if (!element) return;

    try {
      document.body.classList.add('pdf-capture-mode');
      await waitForDataRender('#pdf-root');
      await waitForTargetReady(element);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await waitForImages(element);
      await nextFrame();
      await nextFrame();
      await new Promise((resolve) => window.setTimeout(resolve, 180));

      const rect = element.getBoundingClientRect();
      const textLength = element.innerText?.trim().length || 0;
      console.log('[PDF] target', {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        textLength,
      });
      if (debugEnabled) {
        const hasTitle = Boolean(element.querySelector('h1'));
        console.log('[PDF] title exists', hasTitle);
      }

      const a4HeightPx = 1200 * 1.414;
      const maxSectionHeight = a4HeightPx * 0.9;
      element.querySelectorAll('.print-section, .article, .closing').forEach((node) => {
        const section = node as HTMLElement;
        section.classList.remove('break-ok');
        if (section.getBoundingClientRect().height > maxSectionHeight) {
          section.classList.add('break-ok');
        }
      });

      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [10, 10, 16, 10] as [number, number, number, number],
        filename: getPdfFileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          windowWidth: 1200,
          scale: 2,
          scrollY: 0,
          useCORS: true,
          letterRendering: true,
          ignoreElements: (el: Element) =>
            el.classList?.contains('no-print') || el.classList?.contains('print-hide'),
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'] },
      };

      const worker: any = html2pdf().set(opt).from(element as HTMLElement);
      const pdf = await worker.toPdf().get('pdf');
      const totalPages = pdf.internal.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 1; i <= totalPages; i += 1) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.text(`${i} / ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      const blob = pdf.output('blob');
      console.log('[PDF] blob size', blob.size);
      const blobUrl = URL.createObjectURL(blob);
      if (showInAppGuide) {
        const dataUrl = pdf.output('datauristring');
        submitPdfForm(dataUrl, getPdfFileName);
      } else {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = getPdfFileName;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (downloadError) {
      console.error('PDF 다운로드 실패:', downloadError);
      alert('PDF 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      document.body.classList.remove('pdf-capture-mode');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">계약서를 불러오는 중...</div>;
  }

  if (error || !contractData) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        #pdf-root,
        .contract-view-root {
          overflow: visible;
        }
        #pdf-root {
          padding-bottom: 48mm;
          background: white;
        }
        #pdf-root .print-section,
        #pdf-root .article,
        #pdf-root .closing,
        #pdf-root table,
        #pdf-root tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        #pdf-root .break-ok {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }
        body.pdf-capture-mode .contract-view-root {
          box-shadow: none !important;
          transform: none !important;
        }
        @media print {
          .contract-view-root {
            width: 1200px;
            margin: 0 auto;
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-8 mb-6 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">[학온] 공식 전자계약 확인</h1>
            <p className="text-sm text-gray-500">계약서 내용을 확인하고 안전하게 보관하세요.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-8">
          <div ref={viewRef} className="relative contract-view-root font-serif">
            <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.08]">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: 'repeating-linear-gradient(-30deg, transparent 0 120px, rgba(107,114,128,0.2) 120px 121px)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(-30deg, transparent 0 140px, rgba(107,114,128,0.25) 140px 141px)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-semibold text-gray-500 rotate-[-25deg]">
                  학온(Hagon) 진본 확인
                </span>
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-navy mb-2">강사근로계약서</h1>
                <p className="text-sm text-gray-500 tracking-wide">Employment Contract</p>
              </div>
              <ContractDocument
                className="prose max-w-none text-[10pt] leading-relaxed text-gray-800 space-y-6"
                data={contractData}
                stampUrl={contractData.signature_image_url || undefined}
                showSignatureSection
                showAnnex
              />
            </div>
          </div>

          <div
            ref={captureRef}
            aria-hidden
            className="absolute -left-[9999px] top-0 w-[1200px] bg-white px-10 py-8 font-serif"
          >
            <div id="pdf-root" className="relative contract-view-root">
              <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.08]">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(-30deg, transparent 0 120px, rgba(107,114,128,0.2) 120px 121px)',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(-30deg, transparent 0 140px, rgba(107,114,128,0.25) 140px 141px)',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-semibold text-gray-500 rotate-[-25deg]">
                    학온(Hagon) 진본 확인
                  </span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-navy mb-2">강사근로계약서</h1>
                  <p className="text-base text-gray-500 tracking-wide">Employment Contract</p>
                </div>
                <ContractDocument
                  className="prose max-w-none text-[10pt] leading-relaxed text-gray-800 space-y-6"
                  data={contractData}
                  stampUrl={contractData.signature_image_url || undefined}
                  showSignatureSection
                  showAnnex
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleDownloadPDF}
              className="w-full px-6 py-4 bg-[#FFE812] hover:bg-[#f5d400] text-black text-base sm:text-lg font-semibold rounded-xl transition-colors no-print"
            >
              PDF로 저장하기
            </button>
            {showInAppGuide && (
              <div className="mt-3 text-sm text-gray-500 text-center space-y-2">
                <p>
                  다운로드가 안 될 경우, 우측 상단 메뉴를 눌러 &apos;다른 브라우저로 열기&apos;를 선택해 주세요.
                </p>
                <button
                  onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                  className="text-sm text-gray-600 underline"
                >
                  브라우저로 열기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

