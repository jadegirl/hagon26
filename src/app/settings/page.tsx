'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useWizardStore } from '@/lib/wizard-store';
import StampUploader from '@/components/StampUploader';
import { ArrowLeft } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface AcademyInfo {
  id?: string;
  user_id: string;
  academy_name: string;
  academy_address: string;
  representative_name: string;
  contact: string;
  business_number: string;
  stamp_image_url?: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const {
    academy,
    updateAcademy,
    signatureImageUrl,
    setSignatureImageUrl,
  } = useWizardStore();

  const [user, setUser] = useState<User | null>(null);
  const [savedAcademyInfo, setSavedAcademyInfo] = useState<AcademyInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const canSave = academy.name && academy.address && academy.representative;

  // 사용자 세션 확인 및 저장된 학원정보 불러오기
  useEffect(() => {
    const checkSessionAndLoadAcademy = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);

          // 저장된 학원정보 불러오기
          const { data, error } = await supabase
            .from('academy_info')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('학원정보 불러오기 오류:', error);
          } else if (data) {
            setSavedAcademyInfo(data);
            // 폼에 데이터 채우기
            updateAcademy({
              name: data.academy_name,
              address: data.academy_address,
              representative: data.representative_name,
              phone: data.contact,
              businessNumber: data.business_number,
            });
            if (data.stamp_image_url) {
              setSignatureImageUrl(data.stamp_image_url);
            }
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('세션 확인 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionAndLoadAcademy();
  }, [router, updateAcademy, setSignatureImageUrl]);

  // 학원정보 저장 (upsert)
  const handleSaveAcademy = async () => {
    if (!canSave) {
      setSaveMessage('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (!user) {
      setSaveMessage('로그인이 필요합니다.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const academyData: AcademyInfo = {
        user_id: user.id,
        academy_name: academy.name,
        academy_address: academy.address,
        representative_name: academy.representative,
        contact: academy.phone || '',
        business_number: academy.businessNumber || '',
      };

      if (savedAcademyInfo?.id) {
        // 기존 정보 업데이트
        const { error } = await supabase
          .from('academy_info')
          .update(academyData)
          .eq('id', savedAcademyInfo.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('학원정보 업데이트 오류:', error);
          setSaveMessage('학원정보 저장에 실패했습니다.');
          setIsSaving(false);
          return;
        }
      } else {
        // 새 정보 저장
        const { data, error } = await supabase
          .from('academy_info')
          .insert([academyData])
          .select()
          .single();

        if (error) {
          console.error('학원정보 저장 오류:', error);
          setSaveMessage('학원정보 저장에 실패했습니다.');
          setIsSaving(false);
          return;
        }

        if (data) {
          setSavedAcademyInfo(data);
        }
      }

      setIsSaving(false);
      setSaveMessage('저장되었습니다.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('학원정보 저장 오류:', error);
      setSaveMessage('학원정보 저장에 실패했습니다.');
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 상단 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>대시보드로 돌아가기</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">학원 정보 설정</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">학원 기본 정보를 관리합니다.</p>
        </div>

        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <div className="space-y-6">
              {/* 학원명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  학원명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={academy.name}
                  onChange={(e) => updateAcademy({ name: e.target.value })}
                  placeholder="학원명을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500"
                />
              </div>

              {/* 학원 주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  학원 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={academy.address}
                  onChange={(e) => updateAcademy({ address: e.target.value })}
                  placeholder="학원 주소"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500"
                />
              </div>

              {/* 대표자명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  대표자명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={academy.representative}
                  onChange={(e) => updateAcademy({ representative: e.target.value })}
                  placeholder="대표자 이름"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500"
                />
              </div>

              {/* 학원 연락처 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  학원 연락처
                </label>
                <input
                  type="text"
                  value={academy.phone}
                  onChange={(e) => updateAcademy({ phone: e.target.value })}
                  placeholder="연락처"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500"
                />
              </div>

              {/* 사업자등록번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  사업자등록번호
                </label>
                <input
                  type="text"
                  value={academy.businessNumber}
                  onChange={(e) => updateAcademy({ businessNumber: e.target.value })}
                  placeholder="000-00-00000"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500"
                />
              </div>

              {/* 직인 업로더 */}
              {user && (
                <StampUploader
                  userId={user.id}
                  academyInfo={{
                    academy_name: academy.name,
                    academy_address: academy.address,
                    representative_name: academy.representative,
                    contact: academy.phone,
                    business_number: academy.businessNumber,
                  }}
                  autoUpload
                  label="학원 직인(인장) 등록"
                  description="직인을 등록하면 계약 생성 시 자동으로 포함됩니다."
                  previewSize={80}
                  initialUrl={signatureImageUrl || null}
                  onUploaded={(url) => setSignatureImageUrl(url)}
                />
              )}
            </div>

            {/* 저장 버튼 + 인라인 메시지 */}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
              <button
                onClick={handleSaveAcademy}
                disabled={!canSave || isSaving}
                className="px-6 py-3 bg-navy text-white rounded-lg hover:bg-navy/90 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
              {saveMessage && (
                <span
                  className={`text-sm font-medium transition-opacity duration-200 ${
                    saveMessage === '저장되었습니다.'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
              <button
                onClick={() => router.push('/wizard/type-a')}
                disabled={!canSave}
                className="px-5 py-3 bg-[#FFD85C] text-gray-900 rounded-lg hover:bg-[#f5c84a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
              >
                계약서 작성하러 가기 →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
