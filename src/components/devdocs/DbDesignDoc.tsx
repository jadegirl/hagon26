import React from 'react';
import { Table as TableIcon, CheckCircle2, Clock } from 'lucide-react';

interface Column {
  name: string;
  type: string;
  desc: string;
}

interface TableProps {
  name: string;
  status: 'current' | 'planned';
  description: string;
  columns: Column[];
  notes?: string;
}

const TableCard = ({ name, status, description, columns, notes }: TableProps) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
    <div className="p-5 border-b border-gray-100 flex justify-between items-start">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-gray-900 font-mono">{name}</h3>
          {status === 'current' ? (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> MVP
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Phase 2
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b">Column</th>
            <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b">Type</th>
            <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {columns.map((col, idx) => (
            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3 text-sm font-medium text-gray-700 font-mono">{col.name}</td>
              <td className="px-5 py-3 text-xs text-gray-500 font-mono">{col.type}</td>
              <td className="px-5 py-3 text-sm text-gray-600">{col.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {notes && (
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-bold text-gray-700">Notes:</span> {notes}
        </p>
      </div>
    )}
  </div>
);

export default function DbDesignDoc() {
  const currentTables: TableProps[] = [
    {
      name: 'contracts',
      status: 'current',
      description: '계약서 핵심 데이터 저장',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'user_id', type: 'UUID (FK)', desc: 'auth.users 참조' },
        { name: 'contract_data', type: 'JSONB', desc: '마법사 입력 전체 데이터' },
        { name: 'status', type: 'TEXT', desc: 'draft, completed, signed' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: '생성일시' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', desc: '수정일시' },
      ],
      notes: 'RLS: 자기 계약서만 CRUD 가능. 인덱스: user_id, status, created_at DESC'
    },
    {
      name: 'partners',
      status: 'current',
      description: '파트너사 관리 (플랜, 쿼터, 인증키)',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'name', type: 'TEXT', desc: '파트너사 명칭' },
        { name: 'api_key', type: 'TEXT', desc: '인증용 키' },
      ]
    },
    {
      name: 'partner_sessions',
      status: 'current',
      description: '세션 토큰 (10분 만료, 일회성)',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'partner_id', type: 'UUID (FK)', desc: 'partners 참조' },
        { name: 'token', type: 'TEXT', desc: '일회성 토큰' },
        { name: 'expires_at', type: 'TIMESTAMPTZ', desc: '만료 시간' },
      ]
    },
    {
      name: 'partner_contracts',
      status: 'current',
      description: '파트너 경유 계약 추적',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'contract_id', type: 'UUID (FK)', desc: 'contracts 참조' },
        { name: 'partner_id', type: 'UUID (FK)', desc: 'partners 참조' },
      ]
    }
  ];

  const plannedTables: TableProps[] = [
    {
      name: 'organizations',
      status: 'planned',
      description: '법인 정보 관리',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'name', type: 'TEXT', desc: '법인명' },
        { name: 'biz_number', type: 'TEXT', desc: '사업자번호' },
        { name: 'plan', type: 'TEXT', desc: '구독 플랜' },
      ]
    },
    {
      name: 'academies',
      status: 'planned',
      description: '학원 정보 관리',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'org_id', type: 'UUID (FK)', desc: 'organizations 참조' },
        { name: 'name', type: 'TEXT', desc: '학원명' },
        { name: 'address', type: 'TEXT', desc: '주소' },
      ]
    },
    {
      name: 'user_profiles',
      status: 'planned',
      description: '사용자 프로필 및 소속 관리',
      columns: [
        { name: 'id', type: 'UUID (FK)', desc: 'auth.users 참조' },
        { name: 'org_id', type: 'UUID (FK)', desc: 'organizations 참조' },
        { name: 'academy_id', type: 'UUID (FK)', desc: 'academies 참조' },
        { name: 'role', type: 'TEXT', desc: 'admin, manager, user' },
      ]
    },
    {
      name: 'subscriptions',
      status: 'planned',
      description: '구독 및 결제 관리',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'org_id', type: 'UUID (FK)', desc: 'organizations 참조' },
        { name: 'status', type: 'TEXT', desc: 'active, expired, canceled' },
        { name: 'expires_at', type: 'TIMESTAMPTZ', desc: '만료일' },
      ]
    },
    {
      name: 'contract_templates',
      status: 'planned',
      description: '계약서 템플릿 버전 관리',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'type', type: 'TEXT', desc: '계약 유형' },
        { name: 'schema', type: 'JSONB', desc: '필드 정의 스키마' },
      ]
    },
    {
      name: 'notifications',
      status: 'planned',
      description: '시스템 알림',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'user_id', type: 'UUID (FK)', desc: 'auth.users 참조' },
        { name: 'title', type: 'TEXT', desc: '제목' },
        { name: 'read_at', type: 'TIMESTAMPTZ', desc: '읽은 시간' },
      ]
    },
    {
      name: 'audit_logs',
      status: 'planned',
      description: '감사 로그',
      columns: [
        { name: 'id', type: 'UUID (PK)', desc: '고유 식별자' },
        { name: 'user_id', type: 'UUID (FK)', desc: '수행자' },
        { name: 'action', type: 'TEXT', desc: '수행 작업' },
        { name: 'metadata', type: 'JSONB', desc: '상세 변경 내역' },
      ]
    }
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-12">
      <header className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
          <TableIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">데이터베이스 설계</h1>
          <p className="text-gray-500">Supabase PostgreSQL 테이블 구조 및 관계 정의</p>
        </div>
      </header>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-green-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-gray-800">현재 테이블 (MVP)</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentTables.map((table, idx) => (
            <TableCard key={idx} {...table} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-gray-800">고도화 예정 테이블 (Phase 2)</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plannedTables.map((table, idx) => (
            <TableCard key={idx} {...table} />
          ))}
        </div>
      </section>
    </div>
  );
}
