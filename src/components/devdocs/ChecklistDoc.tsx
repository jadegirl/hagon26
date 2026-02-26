import React from 'react';
import { CheckSquare, Rocket, Shield, Layers, PlusCircle } from 'lucide-react';

interface ChecklistItem {
  text: string;
  completed: boolean;
}

interface CategoryProps {
  title: string;
  icon: React.ReactNode;
  items: ChecklistItem[];
  colorClass: string;
}

const CategorySection = ({ title, icon, items, colorClass }: CategoryProps) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className={`p-5 border-b border-gray-100 flex items-center gap-3 ${colorClass}`}>
      {icon}
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
    <div className="p-6 space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-3 group">
          <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            item.completed 
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white border-gray-300 group-hover:border-blue-400'
          }`}>
            {item.completed && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={`text-sm leading-relaxed ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default function ChecklistDoc() {
  const phase1 = [
    { text: '계약서 마법사 UI/UX 개선 (템플릿 v7 명세 반영)', completed: false },
    { text: '계약서 미리보기 레이아웃 교정 (조항 순서, 급여 테이블, 서명란)', completed: false },
    { text: '대시보드 UI 개선 (통계 카드, 필터 강화)', completed: false },
    { text: '랜딩 페이지 반응형 최적화', completed: false },
    { text: '전자서명 플로우 안정화', completed: false },
    { text: 'PDF 생성 품질 개선', completed: false },
    { text: '에러 핸들링 강화 (API 에러, 네트워크 오류)', completed: false },
  ];

  const phase2 = [
    { text: '회원 체계 구현 (법인→학원→사용자 계층)', completed: false },
    { text: '총관리자 대시보드 구현', completed: false },
    { text: '학원 관리 페이지 (CRUD + 검색/필터)', completed: false },
    { text: '구독/요금 관리 시스템', completed: false },
    { text: '학원 관리자 전용 대시보드', completed: false },
    { text: '강사 관리 (목록, 계약 이력)', completed: false },
    { text: 'D-Day 계약 만료 알림 시스템', completed: false },
    { text: '역할 기반 접근 제어 (RBAC)', completed: false },
  ];

  const phase3 = [
    { text: '계약서 유형 추가 (TYPE_B: 시급제, TYPE_C: 기간제 등)', completed: false },
    { text: '인사서류 확장 (사실확인서, 경위서, 사직서)', completed: false },
    { text: '파트너 API 고도화 (Webhook 재시도, CORS 제한)', completed: false },
    { text: '파트너 관리 어드민 (키 발급, 통계)', completed: false },
    { text: 'API 스펙 문서 SSO 방식 업데이트', completed: false },
    { text: '취소 처리 로직 (마법사 중간 이탈)', completed: false },
    { text: '계약서 버전 관리 (이력 추적)', completed: false },
    { text: '통계/분석 대시보드', completed: false },
  ];

  const infra = [
    { text: 'Supabase RLS 정책 강화 (조직 단위 격리)', completed: false },
    { text: 'CORS 파트너사 도메인만 허용', completed: false },
    { text: '도메인 승인 후 Vercel 연결', completed: false },
    { text: '환경변수 관리 체계화', completed: false },
    { text: '에러 모니터링 (Sentry 등)', completed: false },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-10">
      <header className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
          <CheckSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">개발 체크리스트</h1>
          <p className="text-gray-500">프로젝트 로드맵 및 단계별 구현 현황</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CategorySection 
          title="Phase 1: MVP 고도화" 
          icon={<Rocket className="w-5 h-5 text-blue-600" />}
          items={phase1}
          colorClass="bg-blue-50 text-blue-900"
        />
        <CategorySection 
          title="Phase 2: 관리 시스템" 
          icon={<Layers className="w-5 h-5 text-purple-600" />}
          items={phase2}
          colorClass="bg-purple-50 text-purple-900"
        />
        <CategorySection 
          title="Phase 3: 확장" 
          icon={<PlusCircle className="w-5 h-5 text-green-600" />}
          items={phase3}
          colorClass="bg-green-50 text-green-900"
        />
        <CategorySection 
          title="인프라 / 보안" 
          icon={<Shield className="w-5 h-5 text-red-600" />}
          items={infra}
          colorClass="bg-red-50 text-red-900"
        />
      </div>
    </div>
  );
}
