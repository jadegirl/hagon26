'use client';

import { useState } from 'react';
import { FileText, Layout, Database, Server, CheckSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocFile {
  key: string;
  label: string;
  content: string;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  plan: <FileText size={16} />,
  screen: <Layout size={16} />,
  datamap: <Database size={16} />,
  db: <Server size={16} />,
  checklist: <CheckSquare size={16} />,
};

export default function DevDocsClient({ docs }: { docs: DocFile[] }) {
  const [activeTab, setActiveTab] = useState(docs[0]?.key ?? 'plan');

  const activeDoc = docs.find((d) => d.key === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={20} className="text-gray-500" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">개발문서</h1>
              <p className="text-sm text-gray-500">학온(HAGON) 전자계약 플랫폼 고도화</p>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {docs.map((doc) => (
            <button
              key={doc.key}
              onClick={() => setActiveTab(doc.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === doc.key
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_ICONS[doc.key]}
              {doc.label}
              {activeTab === doc.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 마크다운 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <article className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 prose prose-slate prose-headings:text-gray-900 prose-h1:text-3xl prose-h1:font-bold prose-h2:text-xl prose-h2:font-bold prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-3 prose-h3:text-lg prose-h3:font-semibold prose-table:text-sm prose-th:bg-gray-50 prose-th:px-4 prose-th:py-3 prose-td:px-4 prose-td:py-3 prose-td:border-gray-100 prose-th:border-gray-200 prose-a:text-blue-600 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-hr:border-gray-100 max-w-none prose-li:marker:text-gray-400 prose-input:mr-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {activeDoc?.content ?? ''}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
