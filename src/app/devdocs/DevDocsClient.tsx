'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Layout,
  Database,
  Server,
  CheckSquare,
  GitBranch,
  Camera,
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import ChangelogView from '@/components/ChangelogView';

const MermaidBlock = dynamic(() => import('@/components/MermaidBlock'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8 my-4">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">다이어그램 로딩 중...</span>
    </div>
  ),
});

interface DocFile {
  key: string;
  label: string;
  content: string;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  plan: <FileText size={16} />,
  screen: <Layout size={16} />,
  datamap: <Database size={16} />,
  db: <Server size={16} />,
  checklist: <CheckSquare size={16} />,
  flowchart: <GitBranch size={16} />,
  changelog: <Camera size={16} />,
};

/** 마크다운에서 ## 헤딩을 파싱하여 목차 생성 */
function parseHeadings(markdown: string): HeadingItem[] {
  const lines = markdown.split('\n');
  const headings: HeadingItem[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{2})\.?\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w가-힣\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export default function DevDocsClient({ docs }: { docs: DocFile[] }) {
  const [activeTab, setActiveTab] = useState(docs[0]?.key ?? 'plan');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    [docs[0]?.key ?? 'plan']: true,
  });
  const [activeHeading, setActiveHeading] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  const activeDoc = docs.find((d) => d.key === activeTab);

  /** 각 문서별 헤딩 목차 캐싱 */
  const headingsMap = useMemo(() => {
    const map: Record<string, HeadingItem[]> = {};
    for (const doc of docs) {
      map[doc.key] = parseHeadings(doc.content);
    }
    return map;
  }, [docs]);

  /** 문서 전환 */
  const handleDocSelect = useCallback(
    (key: string) => {
      setActiveTab(key);
      setExpandedSections((prev) => ({ ...prev, [key]: true }));
      setSidebarOpen(false);
      setActiveHeading('');
      // 콘텐츠 최상단으로 스크롤
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  /** 헤딩 클릭 시 스크롤 이동 */
  const handleHeadingClick = useCallback(
    (docKey: string, headingId: string) => {
      if (activeTab !== docKey) {
        setActiveTab(docKey);
        setExpandedSections((prev) => ({ ...prev, [docKey]: true }));
      }
      setSidebarOpen(false);
      setActiveHeading(headingId);

      // DOM 렌더 후 스크롤
      requestAnimationFrame(() => {
        const el = document.getElementById(headingId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    [activeTab]
  );

  /** 섹션 펼침/접힘 토글 */
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /** 스크롤 위치에 따라 활성 헤딩 추적 */
  useEffect(() => {
    const headings = headingsMap[activeTab] ?? [];
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0.1 }
    );

    const timer = setTimeout(() => {
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el) observer.observe(el);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [activeTab, headingsMap]);

  /** ReactMarkdown 커스텀 컴포넌트 — 헤딩에 id 부여 + Mermaid 렌더링 */
  const markdownComponents = useMemo(() => {
    const makeHeadingId = (children: React.ReactNode) => {
      const text = String(children ?? '').replace(/\*\*/g, '').trim();
      return text
        .toLowerCase()
        .replace(/[^\w가-힣\s-]/g, '')
        .replace(/\s+/g, '-');
    };

    return {
      h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const id = makeHeadingId(children);
        return (
          <h2 id={id} className="scroll-mt-20" {...props}>
            {children}
          </h2>
        );
      },
      h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const id = makeHeadingId(children);
        return (
          <h3 id={id} className="scroll-mt-20" {...props}>
            {children}
          </h3>
        );
      },
      code({
        className,
        children,
        ...props
      }: React.HTMLAttributes<HTMLElement>) {
        const match = /language-(\w+)/.exec(className || '');
        if (match && match[1] === 'mermaid') {
          return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">개발문서</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                학온(HAGON) 전자계약 플랫폼
              </p>
            </div>
          </div>

          {/* 모바일 사이드바 토글 */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {sidebarOpen ? (
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            ) : (
              <Menu size={20} className="text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 */}
        <aside
          className={`
            fixed lg:sticky top-[57px] left-0 z-20
            w-72 h-[calc(100vh-57px)]
            bg-white dark:bg-gray-900
            border-r border-gray-200 dark:border-gray-800
            overflow-y-scroll
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-3 space-y-1">
            {docs.map((doc) => {
              const isActive = activeTab === doc.key;
              const isExpanded = expandedSections[doc.key] ?? false;
              const headings = headingsMap[doc.key] ?? [];

              return (
                <div key={doc.key}>
                  {/* 문서 항목 */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleDocSelect(doc.key)}
                      className={`
                        flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-colors duration-150
                        ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                        }
                      `}
                    >
                      <span
                        className={`flex-shrink-0 ${
                          isActive
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {TAB_ICONS[doc.key]}
                      </span>
                      <span className="truncate">{doc.label}</span>
                    </button>

                    {/* 펼침/접힘 버튼 */}
                    {headings.length > 0 && (
                      <button
                        onClick={() => toggleSection(doc.key)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown
                            size={14}
                            className="text-gray-400 dark:text-gray-500"
                          />
                        ) : (
                          <ChevronRight
                            size={14}
                            className="text-gray-400 dark:text-gray-500"
                          />
                        )}
                      </button>
                    )}
                  </div>

                  {/* 하위 헤딩 목록 */}
                  {isExpanded && headings.length > 0 && (
                    <div className="ml-4 mt-1 mb-2 border-l-2 border-gray-100 dark:border-gray-800 pl-3 space-y-0.5">
                      {headings.map((heading) => {
                        const isHeadingActive =
                          isActive && activeHeading === heading.id;
                        return (
                          <button
                            key={heading.id}
                            onClick={() =>
                              handleHeadingClick(doc.key, heading.id)
                            }
                            className={`
                              block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors duration-150 truncate
                              ${heading.level === 3 ? 'pl-4' : ''}
                              ${
                                isHeadingActive
                                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium'
                                  : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }
                            `}
                            title={heading.text}
                          >
                            {heading.text}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* 모바일 오버레이 */}
        <div
          className={`
            fixed inset-0 top-[57px] z-10 bg-black/30 dark:bg-black/50
            lg:hidden transition-opacity duration-200
            ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
          onClick={() => setSidebarOpen(false)}
        />

        {/* 우측 콘텐츠 영역 */}
        <main
          ref={contentRef}
          className="flex-1 overflow-y-scroll h-[calc(100vh-57px)]"
        >
          <div className={activeTab === 'changelog' ? 'mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl' : 'mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl'}>
            {activeTab === 'changelog' ? (
              <ChangelogView />
            ) : (
              <article
                className="
                  bg-white dark:bg-gray-900
                  rounded-2xl shadow-sm
                  border border-gray-200 dark:border-gray-800
                  p-6 sm:p-8 md:p-12
                  prose prose-slate dark:prose-invert
                  prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                  prose-h1:text-3xl prose-h1:font-bold
                  prose-h2:text-xl prose-h2:font-bold prose-h2:border-b prose-h2:border-gray-100 dark:prose-h2:border-gray-800 prose-h2:pb-3
                  prose-h3:text-lg prose-h3:font-semibold
                  prose-table:text-sm
                  prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-3
                  prose-td:px-4 prose-td:py-3
                  prose-td:border-gray-100 dark:prose-td:border-gray-800
                  prose-th:border-gray-200 dark:prose-th:border-gray-700
                  prose-a:text-blue-600 dark:prose-a:text-blue-400
                  prose-code:text-blue-600 dark:prose-code:text-blue-400
                  prose-code:bg-blue-50 dark:prose-code:bg-blue-950/30
                  prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                  prose-code:before:content-none prose-code:after:content-none
                  prose-hr:border-gray-100 dark:prose-hr:border-gray-800
                  max-w-none
                  prose-li:marker:text-gray-400 dark:prose-li:marker:text-gray-500
                  prose-input:mr-2
                  prose-p:text-gray-700 dark:prose-p:text-gray-300
                  prose-li:text-gray-700 dark:prose-li:text-gray-300
                  prose-strong:text-gray-900 dark:prose-strong:text-gray-100
                  prose-blockquote:border-blue-200 dark:prose-blockquote:border-blue-800
                  prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
                  prose-pre:bg-gray-50 prose-pre:text-gray-800 dark:prose-pre:bg-gray-800/50 dark:prose-pre:text-gray-200
                "
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {activeDoc?.content ?? ''}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
