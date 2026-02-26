'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useWizardStore } from '@/lib/wizard-store';
import { supabase } from '@/lib/supabase';

type VerifySuccessResponse = {
  success: true;
  data: {
    session: {
      session_token: string;
      return_url: string;
      academy_name: string;
      rep_name: string;
      biz_number: string;
      academy_address?: string | null;
      academy_phone?: string | null;
      metadata?: {
        _magic_link?: {
          token_hash: string;
          type: string;
        };
        [key: string]: any;
      } | null;
    };
  };
};

type VerifyErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
  data?: {
    return_url?: string | null;
  };
};

export default function PartnerLaunchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const updateAcademy = useWizardStore((state) => state.updateAcademy);

  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('학온 전자계약시스템을 준비하고 있습니다...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [showLoginButton, setShowLoginButton] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (!isMounted) return;
        setErrorMessage('잘못된 접근입니다.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/partner/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const payload = (await response.json()) as VerifySuccessResponse | VerifyErrorResponse;

        if (!response.ok || !payload.success) {
          if (!isMounted) return;
          const errorCode = payload.success ? 'UNKNOWN' : payload.error.code;
          if (errorCode === 'SESSION_EXPIRED') {
            setErrorMessage('세션이 만료되었습니다. 파트너 프로그램에서 다시 시도해주세요.');
          } else if (errorCode === 'SESSION_ALREADY_USED') {
            setErrorMessage('이미 사용된 세션입니다.');
          } else {
            setErrorMessage('잘못된 접근입니다.');
          }
          if (!payload.success && payload.data?.return_url) {
            setReturnUrl(payload.data.return_url);
          }
          setLoading(false);
          return;
        }

        const { session } = payload.data;

        // 파트너 세션 정보를 sessionStorage에 저장
        sessionStorage.setItem(
          'hagon-partner-session',
          JSON.stringify({
            session_token: session.session_token,
            return_url: session.return_url,
          })
        );

        if (session.return_url) {
          setReturnUrl(session.return_url);
        }

        // SSO 방식: 매직 링크로 자동 로그인
        const magicLink = session.metadata?._magic_link;
        if (magicLink?.token_hash) {
          if (!isMounted) return;
          setLoadingMessage('자동 로그인 중입니다...');

          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: magicLink.token_hash,
            type: 'magiclink',
          });

          if (otpError) {
            if (!isMounted) return;
            setErrorMessage('자동 로그인에 실패했습니다. 학온에 직접 로그인해주세요.');
            setShowLoginButton(true);
            setLoading(false);
            return;
          }

          if (!isMounted) return;
          setLoadingMessage('대시보드로 이동합니다...');
          router.push('/dashboard');
          return;
        }

        // 하위 호환: 기존 방식 (매직 링크 없는 세션)
        updateAcademy({
          name: session.academy_name,
          representative: session.rep_name,
          businessNumber: session.biz_number,
          ...(session.academy_address ? { address: session.academy_address } : {}),
          ...(session.academy_phone ? { phone: session.academy_phone } : {}),
        });
        useWizardStore.setState({ currentStep: 2 });

        router.push('/wizard/type-a');
      } catch {
        if (!isMounted) return;
        setErrorMessage('잘못된 접근입니다.');
        setLoading(false);
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [router, token, updateAcademy]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <img
          src="/Header_Logo.png"
          alt="학온 로고"
          className="h-10 mx-auto mb-6"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-navy rounded-full animate-spin" />
            <p className="text-gray-700 font-medium">{loadingMessage}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <p className="text-gray-800 font-semibold">{errorMessage}</p>
            {showLoginButton && (
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2.5 bg-navy text-white rounded-lg font-semibold transition-colors hover:bg-navy/90"
              >
                학온 로그인 페이지로 이동
              </button>
            )}
            {returnUrl && (
              <button
                onClick={() => router.push(returnUrl)}
                className="px-5 py-2.5 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-lg font-semibold transition-colors"
              >
                파트너 프로그램으로 돌아가기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
