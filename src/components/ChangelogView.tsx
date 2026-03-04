'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Monitor, Smartphone, ImageOff } from 'lucide-react';

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

/** 개별 화면 카드 */
function ScreenCard({ screen }: { screen: ScreenEntry }) {
  const [activeView, setActiveView] = useState<ViewTab>('before');

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
          <div className="relative w-full">
            <Image
              src={imageSrc}
              alt={`${screen.label} — ${activeView === 'before' ? '변경 전' : '변경 후'}`}
              width={1440}
              height={900}
              className="w-full h-auto"
              quality={90}
              unoptimized
            />
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
    </div>
  );
}

/** 화면 변경이력 전체 뷰 */
export default function ChangelogView() {
  return (
    <div className="space-y-6">
      {/* 안내 헤더 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 p-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
          📸 화면 변경이력
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          MVP 고도화 작업의 전/후 화면을 비교합니다. 각 카드의{' '}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
            변경 전
          </span>{' '}
          /{' '}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded">
            변경 후
          </span>{' '}
          탭을 클릭하여 비교하세요.
        </p>
      </div>

      {/* 화면 카드 그리드 */}
      <div className="grid grid-cols-1 gap-6">
        {SCREENS.map((screen) => (
          <ScreenCard key={screen.id} screen={screen} />
        ))}
      </div>
    </div>
  );
}
