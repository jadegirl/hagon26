'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useWizardStore } from '@/lib/wizard-store';
import type { User } from '@supabase/supabase-js';

export default function PilotJrPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const wizardState = useWizardStore();

  useEffect(() => {
    // 현재 세션 확인
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        // 세션이 없으면 로그인 페이지로 리다이렉트
        router.push('/login');
      }
      setLoading(false);
    };

    checkSession();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSaveContract = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSaving(true);
    setShowSuccess(false);

    try {
      // Supabase 테이블 컬럼 규격에 맞게 데이터 매핑
      const contractData = {
        created_by: user.id, // 현재 로그인한 유저의 ID
        academy: {
          name: wizardState.academy.name || '',
          address: wizardState.academy.address || '',
          representative: wizardState.academy.representative || '',
          phone: wizardState.academy.phone || '',
          businessNumber: wizardState.academy.businessNumber || '',
        },
        instructor: {
          name: wizardState.instructor.name || '',
          address: wizardState.instructor.address || '',
          phone: wizardState.instructor.phone || '',
          birthDate: wizardState.instructor.birthDate || '',
          subject: wizardState.instructor.subject || '',
          grade: wizardState.instructor.grade || '',
        },
        contract_period: {
          startDate: wizardState.contractPeriod.startDate || '',
          endDate: wizardState.contractPeriod.endDate || '',
          probationMonths: wizardState.contractPeriod.probationMonths || 0,
          durationMonths: wizardState.contractPeriod.durationMonths || 0,
        },
        work_condition: {
          weeklyHours: wizardState.workCondition.weeklyHours || 0,
          workDays: wizardState.workCondition.workDays || 0,
          weeklyHoliday: wizardState.workCondition.weeklyHoliday || '',
          schedule: wizardState.workCondition.schedule || [],
        },
        salary: {
          type: wizardState.salary.type || 'FIXED',
          baseSalary: wizardState.salary.baseSalary || 0,
          hourlyWage: wizardState.salary.hourlyWage || 0,
          revenueRatio: wizardState.salary.revenueRatio || 0,
          minGuarantee: wizardState.salary.minGuarantee || 0,
          payDay: wizardState.salary.payDay || 10,
          mealAllowance: wizardState.salary.mealAllowance || 0,
          transportAllowance: wizardState.salary.transportAllowance || 0,
          positionAllowance: wizardState.salary.positionAllowance || 0,
          otherAllowance: wizardState.salary.otherAllowance || 0,
          otherAllowanceMemo: wizardState.salary.otherAllowanceMemo || '',
          percentageBaseSalary: wizardState.salary.percentageBaseSalary || 0,
          percentageWeeklyHolidayPay: wizardState.salary.percentageWeeklyHolidayPay || 0,
        },
        protection: {
          hasNonCompete: wizardState.protection.hasNonCompete || false,
          nonCompetePeriod: wizardState.protection.nonCompetePeriod || 0,
          nonCompeteRadius: wizardState.protection.nonCompeteRadius || 0,
          nonCompeteCompensation: wizardState.protection.nonCompeteCompensation || 0,
        },
        calculated: {
          weeklyHours: wizardState.calculated.weeklyHours || 0,
          dailyHours: wizardState.calculated.dailyHours || 0,
          weeklyHolidayHours: wizardState.calculated.weeklyHolidayHours || 0,
          monthlyWorkHours: wizardState.calculated.monthlyWorkHours || 0,
          hourlyRate: wizardState.calculated.hourlyRate || 0,
          weeklyHolidayPay: wizardState.calculated.weeklyHolidayPay || 0,
        },
        special_terms: wizardState.specialTerms || '',
      };

      // Supabase contracts 테이블에 데이터 저장
      const { data, error } = await supabase
        .from('contracts')
        .insert([contractData])
        .select();

      if (error) {
        console.error('Error saving contract:', error);
        alert('계약서 저장 중 오류가 발생했습니다: ' + error.message);
        setSaving(false);
        return;
      }

      // 저장 성공
      setShowSuccess(true);
      setSaving(false);
      
      // 성공 메시지 표시 후 2초 뒤 대시보드로 이동
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('예상치 못한 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1><span style={{ fontFamily: "'Sora', sans-serif" }} className="text-xl font-bold tracking-tight">hag<span className="text-hagon-blue">on</span></span></h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-navy rounded-lg hover:bg-blue-800 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 성공 알림 */}
      {showSuccess && (
        <div className="fixed top-20 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">클라우드에 안전하게 저장되었습니다</span>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">계약서 작성</h2>
            <p className="text-gray-600 mt-1">계약서 정보를 입력하고 저장하세요.</p>
          </div>

          {/* 계약서 입력 폼 */}
          <div className="space-y-6">
            {/* 학원 정보 */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-navy mb-4">학원 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">학원명</label>
                  <input
                    type="text"
                    value={wizardState.academy.name}
                    onChange={(e) => wizardState.updateAcademy({ name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="학원명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">대표자명</label>
                  <input
                    type="text"
                    value={wizardState.academy.representative}
                    onChange={(e) => wizardState.updateAcademy({ representative: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="대표자명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                  <input
                    type="text"
                    value={wizardState.academy.address}
                    onChange={(e) => wizardState.updateAcademy({ address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="학원 주소를 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                  <input
                    type="text"
                    value={wizardState.academy.phone}
                    onChange={(e) => wizardState.updateAcademy({ phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="010-0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">사업자번호</label>
                  <input
                    type="text"
                    value={wizardState.academy.businessNumber}
                    onChange={(e) => wizardState.updateAcademy({ businessNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="사업자번호를 입력하세요"
                  />
                </div>
              </div>
            </div>

            {/* 강사 정보 */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-navy mb-4">강사 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">강사명</label>
                  <input
                    type="text"
                    value={wizardState.instructor.name}
                    onChange={(e) => wizardState.updateInstructor({ name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="강사 이름을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">담당 과목</label>
                  <input
                    type="text"
                    value={wizardState.instructor.subject}
                    onChange={(e) => wizardState.updateInstructor({ subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="예: 수학, 영어"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                  <input
                    type="text"
                    value={wizardState.instructor.address}
                    onChange={(e) => wizardState.updateInstructor({ address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="강사 주소를 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                  <input
                    type="text"
                    value={wizardState.instructor.phone}
                    onChange={(e) => wizardState.updateInstructor({ phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="010-0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">생년월일</label>
                  <input
                    type="date"
                    value={wizardState.instructor.birthDate}
                    onChange={(e) => wizardState.updateInstructor({ birthDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 계약 기간 */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-navy mb-4">계약 기간</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">계약 시작일</label>
                  <input
                    type="date"
                    value={wizardState.contractPeriod.startDate}
                    onChange={(e) => wizardState.updateContractPeriod({ startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">계약 종료일</label>
                  <input
                    type="date"
                    value={wizardState.contractPeriod.endDate}
                    onChange={(e) => wizardState.updateContractPeriod({ endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수습 기간 (개월)</label>
                  <input
                    type="number"
                    value={wizardState.contractPeriod.probationMonths}
                    onChange={(e) => wizardState.updateContractPeriod({ probationMonths: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* 급여 정보 */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-navy mb-4">급여 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">급여 유형</label>
                  <select
                    value={wizardState.salary.type}
                    onChange={(e) => wizardState.updateSalary({ type: e.target.value as 'FIXED' | 'PERCENTAGE' | 'HOURLY' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                  >
                    <option value="FIXED">고정급</option>
                    <option value="PERCENTAGE">성과급</option>
                    <option value="HOURLY">시급</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">기본급</label>
                  <input
                    type="number"
                    value={wizardState.salary.baseSalary}
                    onChange={(e) => wizardState.updateSalary({ baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">시급</label>
                  <input
                    type="number"
                    value={wizardState.salary.hourlyWage}
                    onChange={(e) => wizardState.updateSalary({ hourlyWage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">급여일</label>
                  <input
                    type="number"
                    value={wizardState.salary.payDay}
                    onChange={(e) => wizardState.updateSalary({ payDay: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    placeholder="10"
                    min="1"
                    max="31"
                  />
                </div>
              </div>
            </div>

            {/* 특별 약정 */}
            <div>
              <h3 className="text-lg font-semibold text-navy mb-4">특별 약정</h3>
              <textarea
                value={wizardState.specialTerms}
                onChange={(e) => wizardState.updateSpecialTerms(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                rows={4}
                placeholder="특별 약정 사항을 입력하세요"
              />
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSaveContract}
              disabled={saving}
              className="px-6 py-3 bg-navy text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '계약서 저장'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

