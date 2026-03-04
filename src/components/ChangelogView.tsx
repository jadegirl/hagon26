'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Monitor, Smartphone, ImageOff, ZoomIn, X } from 'lucide-react';

/** 화면 변경이력 데이터 */
interface ScreenEntry {
  id: string;
  label: string;
  description: string;
  beforeImage: string;
  afterImage: string | null; // null이면 아직 고도화 전
}

const SCREENS: ScreenEntry[] = [
  {
    id: 'landing',
    label: '랜딩 페이지',
    description: '서비스 소개, 기능 안내, 가격표, 리뷰, CTA',
    beforeImage: '/changelog/before/01-landing.png',
    afterImage: null,
  },
  {
    id: 'login',
    label: '로그인',
    description: '이메일/비밀번호 폼, 회원가입 버튼',
    beforeImage: '/changelog/before/02-login.png',
    afterImage: null,
  },
  {
    id: 'dashboard',
    label: '대시보드',
    description: '통계 카드, 진행중/체결완료 탭, 강사명 검색, 테이블',
    beforeImage: '/changelog/before/03-dashboard.png',
    afterImage: null,
  },
  {
    id: 'wizard',
    label: '새 계약서 (Step 1)',
    description: '학원정보 입력 — 학원명, 주소, 대표자, 연락처, 사업자번호, 직인등록',
    beforeImage: '/changelog/before/04-wizard-step1.png',
    afterImage: null,
  },
];

type ViewTab = 'before' | 'after';

/** 이미지 전체화면 뷰어 (항상 렌더링, opacity/pointer-events 토글) */
function ImageLightbox({
  isOpen,
  src,
  alt,
  onClose,
}: {
  isOpen: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center bg-black/80
        transition-opacity duration-200
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X size={24} className="text-white" />
      </button>

      {/* 안내 텍스트 */}
      <p className="absolute top-4 left-4 text-white/60 text-sm">
        클릭하면 닫힙니다
      </p>

      {/* 이미지 */}
      <div
        className="max-w-[95vw] max-h-[95vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1920}
          height={1200}
          className="w-auto h-auto max-h-[90vh] object-contain cursor-pointer"
          quality={100}
          unoptimized
          onClick={onClose}
        />
      </div>
    </div>
  );
}

/** 개별 화면 카드 */
function ScreenCard({ screen }: { screen: ScreenEntry }) {
  const [activeView, setActiveView] = useState<ViewTab>('before');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageSrc = activeView === 'before' ? screen.beforeImage : screen.afterImage;
  const hasAfter = screen.afterImage !== null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* 카드 헤더 */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Monitor size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {screen.label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {screen.description}
              </p>
            </div>
          </div>

          {/* before/after 탭 전환 */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setActiveView('before')}
              className={`
                px-3 py-1.5 text-xs font-medium transition-colors duration-150
                ${
                  activeView === 'before'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              변경 전
            </button>
            <button
              onClick={() => setActiveView('after')}
              className={`
                px-3 py-1.5 text-xs font-medium transition-colors duration-150 border-l border-gray-200 dark:border-gray-700
                ${
                  activeView === 'after'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              변경 후
            </button>
          </div>
        </div>
      </div>

      {/* 이미지 영역 */}
      <div className="relative bg-gray-50 dark:bg-gray-950 min-h-[200px]">
        {activeView === 'after' && !hasAfter ? (
          /* 아직 고도화 전 placeholder */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <ImageOff size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              고도화 진행 후 추가됩니다
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              작업 완료 시 변경된 화면이 자동으로 업데이트됩니다
            </p>
          </div>
        ) : imageSrc ? (
          <div
            className="relative w-full cursor-pointer group"
            onClick={() => setLightboxOpen(true)}
          >
            <Image
              src={imageSrc}
              alt={`${screen.label} — ${activeView === 'before' ? '변경 전' : '변경 후'}`}
              width={1920}
              height={1200}
              className="w-full h-auto"
              quality={95}
              unoptimized
            />
            {/* 호버 시 확대 아이콘 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-full p-3">
                <ZoomIn size={24} className="text-white" />
              </div>
            </div>
          </div>
        ) : null}

        {/* 라벨 뱃지 */}
        <div className="absolute top-3 left-3">
          <span
            className={`
              inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm
              ${
                activeView === 'before'
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
              }
            `}
          >
            <Smartphone size={12} />
            {activeView === 'before' ? 'MVP 원본' : '고도화 완료'}
          </span>
        </div>
      </div>

      {/* 전체화면 뷰어 (항상 렌더링) */}
      <ImageLightbox
        isOpen={lightboxOpen}
        src={imageSrc ?? ''}
        alt={`${screen.label} — ${activeView === 'before' ? '변경 전' : '변경 후'}`}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

/** 화면 변경이력 전체 뷰 */
export default function ChangelogView() {
  const [activeScreen, setActiveScreen] = useState(SCREENS[0].id);

  const currentScreen = SCREENS.find((s) => s.id === activeScreen) ?? SCREENS[0];

  return (
    <div className="space-y-4">
      {/* 화면 선택 탭 */}
      <div className="flex rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
        {SCREENS.map((screen) => {
          const isActive = activeScreen === screen.id;
          return (
            <button
              key={screen.id}
              onClick={() => setActiveScreen(screen.id)}
              className={`
                flex-1 px-4 py-3 text-sm font-medium transition-colors duration-150 text-center
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              {screen.label}
            </button>
          );
        })}
      </div>

      {/* 선택된 화면 카드 1개 */}
      <ScreenCard key={currentScreen.id} screen={currentScreen} />
    </div>
  );
}
