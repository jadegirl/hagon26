'use client';

import { useState } from 'react';
import { FileText, Layout, Database, Server, CheckSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PlanDoc from '@/components/devdocs/PlanDoc';
import ScreenStructureDoc from '@/components/devdocs/ScreenStructureDoc';
import DataMapDoc from '@/components/devdocs/DataMapDoc';
import DbDesignDoc from '@/components/devdocs/DbDesignDoc';
import ChecklistDoc from '@/components/devdocs/ChecklistDoc';

type DocTab = 'plan' | 'screen' | 'datamap' | 'db' | 'checklist';

const TABS: { key: DocTab; label: string; icon: React.ReactNode }[] = [
  { key: 'plan', label: '계획서', icon: <FileText size={16} /> },
  { key: 'screen', label: '화면 구조도', icon: <Layout size={16} /> },
  { key: 'datamap', label: '데이터맵', icon: <Database size={16} /> },
  { key: 'db', label: 'DB 설계', icon: <Server size={16} /> },
  { key: 'checklist', label: '체크리스트', icon: <CheckSquare size={16} /> },
];

export default function DevDocsPage() {
  const [activeTab, setActiveTab] = useState<DocTab>('plan');

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
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.key
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'plan' && <PlanDoc />}
        {activeTab === 'screen' && <ScreenStructureDoc />}
        {activeTab === 'datamap' && <DataMapDoc />}
        {activeTab === 'db' && <DbDesignDoc />}
        {activeTab === 'checklist' && <ChecklistDoc />}
      </main>
    </div>
  );
}
