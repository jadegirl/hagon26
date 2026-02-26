import React from 'react';
import { Database, Layout, HardDrive, Construction } from 'lucide-react';

export default function DataMapDoc() {
  const dataMap = [
    { screen: '랜딩 페이지', source: '정적', detail: '리스크 진단 질문 데이터 (인라인 상수)' },
    { screen: '로그인', source: 'Supabase Auth', detail: 'supabase.auth.signUp / signInWithPassword' },
    { screen: '대시보드', source: 'Supabase DB', detail: 'contracts 테이블 (user_id로 필터)' },
    { screen: '마법사 전체', source: 'Zustand (persist)', detail: 'wizard-store.ts — Academy, Instructor, ContractPeriod, WorkCondition, Salary, Protection' },
    { screen: '마법사 complete', source: 'Supabase DB', detail: 'contracts 테이블 INSERT (contract_data JSONB)' },
    { screen: '전자서명', source: 'Supabase DB', detail: 'contracts 테이블 UPDATE (signed_at) + react-signature-canvas' },
    { screen: '계약서 조회', source: 'Supabase DB', detail: 'contracts 테이블 SELECT by id' },
    { screen: '파트너 런칭', source: 'Supabase DB', detail: 'partner_sessions 테이블 + supabase.auth.verifyOtp' },
    { screen: 'PDF 생성', source: 'API Route', detail: 'html2canvas → jspdf (서버사이드)' },
  ];

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          데이터 소스 유형 레전드
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Supabase DB</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <HardDrive className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Zustand (Local)</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
            <Layout className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">정적 상수</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
            <Construction className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">미구현 (Mock)</span>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">화면별 데이터맵</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b">화면</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b">데이터 소스</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataMap.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.screen}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      item.source.includes('Supabase') ? 'bg-blue-100 text-blue-700' :
                      item.source.includes('Zustand') ? 'bg-purple-100 text-purple-700' :
                      item.source.includes('정적') ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 text-gray-800">고도화 시 추가 예정 데이터</h2>
        <div className="flex flex-wrap gap-3">
          {['회원 (users/organizations)', '구독 (subscriptions)', '알림 (notifications)'].map((item, idx) => (
            <span key={idx} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {item}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
