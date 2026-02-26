'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';

type KakaoScriptLoaderProps = {
  kakaoKey: string;
};

export default function KakaoScriptLoader({ kakaoKey }: KakaoScriptLoaderProps) {
  const [loaded, setLoaded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState('loading');
  const [origin, setOrigin] = useState('');
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOrigin(window.location.origin);
    setDebugEnabled(window.location.search.includes('debug=1'));
  }, []);

  const keySuffix = useMemo(() => (kakaoKey ? kakaoKey.slice(-6) : '없음'), [kakaoKey]);

  const updateStatus = (next: string) => {
    setStatus(next);
    const kakao = (window as any).Kakao;
    console.log('[Kakao]', {
      loaded: Boolean(kakao),
      initialized: Boolean(kakao?.isInitialized?.()),
      origin: window.location.origin,
      keySuffix,
    });
  };

  return (
    <>
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.5.0/kakao.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          const kakao = (window as any).Kakao;
          setLoaded(Boolean(kakao));
          if (!kakaoKey) {
            setStatus('Key is missing');
            updateStatus('key-missing');
            return;
          }
          if (!kakao) {
            setStatus('Kakao is not defined');
            updateStatus('kakao-missing');
            return;
          }
          try {
            if (!kakao.isInitialized?.()) {
              kakao.init(kakaoKey);
            }
            const initState = Boolean(kakao?.isInitialized?.());
            setInitialized(initState);
            setStatus(initState ? 'initialized' : 'init-failed');
            updateStatus(initState ? 'initialized' : 'init-failed');
          } catch (error) {
            setInitialized(false);
            setStatus('init-failed');
            updateStatus('init-failed');
          }
        }}
      />
      {debugEnabled && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-gray-900 text-white text-xs px-3 py-2 shadow-lg">
          <div>[Kakao] loaded={String(loaded)} initialized={String(initialized)}</div>
          <div>origin={origin || '-'}</div>
          <div>key={keySuffix}</div>
          <div>status={status}</div>
        </div>
      )}
    </>
  );
}

