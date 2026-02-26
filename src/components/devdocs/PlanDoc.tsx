import React from 'react';
import { 
  FileText, 
  Layers, 
  Users, 
  Zap, 
  Cpu, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Rocket, 
  Database, 
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';

export default function PlanDoc() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold tracking-wide uppercase">
            Development Roadmap
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            학온(HAGON) 전자계약 플랫폼 <span className="text-blue-600">고도화 개발계획서</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            학원 강사 근로계약서의 법적 리스크 자동 검증 및 전자 서명 통합 시스템 구축을 위한 단계별 로드맵
          </p>
        </header>

        {/* 1. 프로젝트 개요 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">1. 프로젝트 개요</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {[
                { label: '프로젝트명', value: '학온(HAGON)' },
                { label: '유형', value: '학원 전자계약 플랫폼' },
                { label: '목표', value: '법적 리스크 자동 검증 + 전자 서명 + 계약 관리 통합' },
                { label: '타겟 사용자', value: '학원 원장, 상위 법인 관리자' },
                { label: '비즈니스 모델', value: '월 구독료 (체험판 → 프로 → 엔터프라이즈)' },
                { label: '기술 스택', value: 'Next.js 14, TS, Tailwind, Supabase, Zustand' },
                { label: '핵심 차별점', value: '1,200건 분쟁 데이터 기반 18가지 법적 자동 검증', highlight: true },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 w-24 shrink-0">{item.label}</span>
                  <span className={`text-base ${item.highlight ? 'font-bold text-blue-600' : 'text-slate-900'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. 고도화 범위 (Phase별) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">2. 고도화 범위 (Phase별)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                phase: 'Phase 1',
                title: 'MVP 고도화',
                items: ['계약서 UI/UX 개선', '대시보드 고도화', '기존 기능 안정화'],
                color: 'bg-blue-600',
                lightColor: 'bg-blue-50',
                textColor: 'text-blue-700'
              },
              {
                phase: 'Phase 2',
                title: '관리 시스템',
                items: ['총관리자/학원관리자 시스템', '회원체계(법인→하위 학원)', '구독 관리'],
                color: 'bg-navy-900',
                lightColor: 'bg-slate-100',
                textColor: 'text-slate-700'
              },
              {
                phase: 'Phase 3',
                title: '확장',
                items: ['계약서 유형 추가(시급제 등)', '인사서류 확장', '파트너 API 고도화'],
                color: 'bg-amber-400',
                lightColor: 'bg-amber-50',
                textColor: 'text-amber-700'
              }
            ].map((p, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${p.color}`} />
                <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${p.lightColor} ${p.textColor}`}>
                  {p.phase}
                </div>
                <h3 className="text-lg font-bold">{p.title}</h3>
                <ul className="space-y-2">
                  {p.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 3. 회원 체계 & 4. 핵심 기능 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 3. 회원 체계 */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold">3. 회원 체계</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { role: '슈퍼관리자', desc: '학온 운영팀 (전체 시스템 제어)' },
                { role: '법인 관리자', desc: '학원 법인 대표 (소속 학원 통합 관리)' },
                { role: '학원 관리자', desc: '개별 학원 원장 (계약 생성 및 관리)' },
                { role: '강사', desc: '서명/열람 전용 사용자' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{item.role}</div>
                    <div className="text-sm text-slate-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. 핵심 기능 */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Zap className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold">4. 핵심 기능</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: '계약서 마법사', desc: '8단계 스텝 가이드' },
                { title: '전자서명', desc: '카카오톡/링크 발송' },
                { title: 'D-Day 알림', desc: '계약 만료일 관리' },
                { title: '법적 리스크 검증', desc: '18가지 항목 자동 체크' },
                { title: '파트너 API', desc: 'SSO + Webhook 연동' },
                { title: 'PDF 다운로드', desc: '표준 양식 출력' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-sm text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 5. 기술 아키텍처 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <Cpu className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">5. 기술 아키텍처</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <LayoutDashboard className="w-4 h-4" /> Frontend
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Next.js 14 App Router</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Tailwind CSS</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Zustand (Persist)</li>
                </ul>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <Database className="w-4 h-4" /> Backend & Infra
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Supabase (PostgreSQL)</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> RLS & Auth</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Vercel Deployment</li>
                </ul>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <Rocket className="w-4 h-4" /> Specialized Tech
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> html2canvas + jspdf</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> react-signature-canvas</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Kakao SDK Integration</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 일정 (예상) */}
        <section className="bg-slate-900 rounded-2xl shadow-xl p-8 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full -mr-32 -mt-32" />
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold">6. 일정 (예상)</h2>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {[
                { phase: 'Phase 1', duration: '2주', label: 'MVP 고도화' },
                { phase: 'Phase 2', duration: '3주', label: '관리 시스템' },
                { phase: 'Phase 3', duration: '2주', label: '확장 및 안정화' },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 w-full text-center space-y-2">
                  <div className="text-blue-400 text-sm font-bold uppercase tracking-widest">{item.phase}</div>
                  <div className="text-3xl font-bold">{item.duration}</div>
                  <div className="text-slate-400 text-sm">{item.label}</div>
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-[30%] lg:right-[31%]">
                      <ArrowRight className="w-6 h-6 text-slate-700" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-12 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>학온(HAGON) 고도화 프로젝트 - Confidential</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
