import React from 'react';
import { 
  Layout, 
  LogIn, 
  Home, 
  FileText, 
  Wand2, 
  PenTool, 
  Eye, 
  Link, 
  Settings, 
  Users, 
  Building2, 
  ShieldCheck,
  Server,
  Database
} from 'lucide-react';

type Status = 'completed' | 'in_progress' | 'planned';

interface ScreenInfo {
  path: string;
  name: string;
  description: string;
  status: Status;
  icon: React.ElementType;
}

interface ScreenGroup {
  title: string;
  screens: ScreenInfo[];
}

const screenGroups: ScreenGroup[] = [
  {
    title: '공개 페이지',
    screens: [
      { path: '/', name: '랜딩 페이지', description: '서비스 소개, 기능, 가격, 리스크 진단', status: 'completed', icon: Home },
      { path: '/login', name: '로그인/회원가입', description: '사용자 인증 및 계정 생성', status: 'completed', icon: LogIn },
    ]
  },
  {
    title: '사용자 페이지',
    screens: [
      { path: '/dashboard', name: '대시보드', description: '계약서 목록, 진행중/완료 탭, 검색, 카카오 공유', status: 'completed', icon: Layout },
      { path: '/wizard/type-a/*', name: '계약서 마법사 TYPE_A', description: '정규직 강사 계약서 작성 프로세스 (Step 1~8)', status: 'completed', icon: Wand2 },
      { path: '/sign/[id]', name: '전자서명 페이지', description: '계약 당사자 전자서명 진행', status: 'completed', icon: PenTool },
      { path: '/view/[id]', name: '계약서 조회', description: '계약서 내용 확인 (읽기 전용)', status: 'completed', icon: Eye },
    ]
  },
  {
    title: '파트너 연동',
    screens: [
      { path: '/partner/launch', name: '파트너 런칭 페이지', description: 'SSO 자동 로그인 및 연동 시작', status: 'completed', icon: Link },
      { path: '/api/partner/session', name: '세션 생성 API', description: '파트너 세션 토큰 발급', status: 'completed', icon: Server },
      { path: '/api/partner/verify', name: '토큰 검증 API', description: '발급된 토큰 유효성 확인', status: 'completed', icon: ShieldCheck },
      { path: '/api/partner/sso', name: 'SSO API', description: '단일 로그인 처리', status: 'completed', icon: LogIn },
      { path: '/api/partner/callback', name: '계약 완료 콜백', description: '계약 완료 시 파트너사 알림', status: 'completed', icon: Database },
      { path: '/api/partner/cancel', name: '취소 처리', description: '계약 진행 취소 처리', status: 'completed', icon: Server },
    ]
  },
  {
    title: '고도화 예정 (Phase 2)',
    screens: [
      { path: '/admin', name: '총관리자 대시보드', description: '시스템 전체 현황 및 통계', status: 'planned', icon: Settings },
      { path: '/admin/academies', name: '학원 관리', description: '등록된 학원 정보 관리', status: 'planned', icon: Building2 },
      { path: '/admin/subscriptions', name: '구독/요금 관리', description: '결제 및 구독 플랜 관리', status: 'planned', icon: FileText },
      { path: '/admin/users', name: '사용자 관리', description: '전체 사용자 계정 관리', status: 'planned', icon: Users },
      { path: '/academy/[id]/dashboard', name: '학원 관리자 대시보드', description: '개별 학원 운영 현황', status: 'planned', icon: Layout },
      { path: '/academy/[id]/contracts', name: '학원별 계약서 관리', description: '학원 내 계약서 통합 관리', status: 'planned', icon: FileText },
      { path: '/academy/[id]/staff', name: '강사 관리', description: '학원 소속 강사 정보 관리', status: 'planned', icon: Users },
    ]
  }
];

const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    planned: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    completed: '완료',
    in_progress: '진행중',
    planned: '예정',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default function ScreenStructureDoc() {
  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">학온(HAGON) 전체 화면 구조도</h1>
          <p className="text-gray-600">프로젝트의 주요 페이지 및 API 엔드포인트 구조입니다.</p>
        </header>

        <div className="space-y-16">
          {screenGroups.map((group) => (
            <section key={group.title}>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                {group.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.screens.map((screen) => (
                  <div 
                    key={screen.path} 
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <screen.icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <StatusBadge status={screen.status} />
                    </div>
                    
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                        {screen.name}
                      </h3>
                      <code className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                        {screen.path}
                      </code>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {screen.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
