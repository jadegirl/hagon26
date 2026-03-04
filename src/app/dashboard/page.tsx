'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWizardStore } from '@/lib/wizard-store';
import type { User } from '@supabase/supabase-js';

interface Contract {
  id: string;
  user_id: string;
  contract_data: {
    academy?: { name?: string };
    instructor?: { name?: string };
    contract_period?: { start_date?: string; end_date?: string };
    contractPeriod?: { startDate?: string; endDate?: string };
  };
  status: string;
  created_at: string;
  updated_at: string;
  signed_at?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed'>('in-progress');
  const [searchTerm, setSearchTerm] = useState('');
  const [kakaoReady, setKakaoReady] = useState(false);
  const [kakaoDisabledReason, setKakaoDisabledReason] = useState('SDK 미로딩');
  const [kakaoInitFailed, setKakaoInitFailed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const kakaoLogoUrl = 'https://hagon-cloud.vercel.app/logo.png';
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

  // 계약서 목록 불러오기 함수
  const loadContracts = async (userId: string) => {
    try {
      setContractsLoading(true);
      setContractsError(null);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('계약서 목록 불러오기 오류:', error);
        setContractsError(error.message || '계약서 목록을 불러오는 중 오류가 발생했습니다.');
        setContracts([]);
        return;
      }

      setContracts(data || []);
    } catch (error) {
      console.error('계약서 목록 불러오기 오류:', error);
      setContractsError('계약서 목록을 불러오는 중 오류가 발생했습니다.');
      setContracts([]);
    } finally {
      setContractsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 현재 세션 확인 및 계약서 목록 불러오기
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        // 세션이 확인되면 계약서 목록 불러오기
        if (mounted) {
          await loadContracts(session.user.id);
        }
      } else {
        // 세션이 없으면 로그인 페이지로 리다이렉트
        if (mounted) {
          router.push('/login');
        }
      }
      if (mounted) {
        setLoading(false);
      }
    };

    checkSession();

    // 인증 상태 변경 감지 (로그아웃 시에만 리다이렉트)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const keySuffix = kakaoKey ? kakaoKey.slice(-6) : '없음';
    const logStatus = (note: string) => {
      const kakao = (window as any).Kakao;
      console.log(
        `[Kakao SDK] ${note}`,
        {
          hasKakao: Boolean(kakao),
          isInitialized: Boolean(kakao?.isInitialized?.()),
          keySuffix,
          origin,
        }
      );
    };
    let attempts = 0;
    const checkReady = () => {
      const kakao = (window as any).Kakao;
      logStatus('check');
      if (kakao) {
        if (!kakao.isInitialized?.() && kakaoKey) {
          try {
            kakao.init(kakaoKey);
          } catch (error) {
            console.warn('Kakao SDK 초기화 실패:', error);
            setKakaoDisabledReason('init 실패');
            setKakaoInitFailed(true);
          }
        }
        if (kakao.isInitialized?.()) {
          setKakaoReady(true);
          setKakaoDisabledReason('');
          return;
        }
        if (!kakaoKey) {
          setKakaoDisabledReason('키 없음');
        } else if (!kakao.isInitialized?.()) {
          setKakaoDisabledReason(kakaoInitFailed ? 'init 실패' : '도메인 미등록');
        }
      } else {
        setKakaoDisabledReason('SDK 미로딩');
      }
      attempts += 1;
      if (attempts >= 10) return;
      window.setTimeout(checkReady, 300);
    };
    checkReady();
  }, [kakaoKey]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreateContract = () => {
    router.push('/wizard/type-a');
  };

  const handleDeleteClick = (contractId: string) => {
    setContractToDelete(contractId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contractToDelete || !user) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractToDelete)
        .eq('user_id', user.id);

      if (error) {
        console.error('계약서 삭제 오류:', error);
        alert('계약서 삭제 중 오류가 발생했습니다.');
        setDeleting(false);
        return;
      }

      // 삭제 성공 후 목록 새로고침
      await loadContracts(user.id);
      setDeleteModalOpen(false);
      setContractToDelete(null);
    } catch (error) {
      console.error('계약서 삭제 오류:', error);
      alert('계약서 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setContractToDelete(null);
  };

  // 개별 체크박스 토글
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 현재 탭의 전체 선택/해제
  const toggleSelectAll = () => {
    const currentList = activeTab === 'in-progress' ? ongoingContracts : filteredCompletedContracts;
    const allIds = currentList.map((c) => c.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  // 일괄 삭제 확인
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0 || !user) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .in('id', Array.from(selectedIds))
        .eq('user_id', user.id);

      if (error) {
        console.error('일괄 삭제 오류:', error);
        alert('일괄 삭제 중 오류가 발생했습니다.');
        setBulkDeleting(false);
        return;
      }

      await loadContracts(user.id);
      setSelectedIds(new Set());
      setBulkDeleteModalOpen(false);
    } catch (error) {
      console.error('일괄 삭제 오류:', error);
      alert('일괄 삭제 중 오류가 발생했습니다.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRowClick = (contractId: string) => {
    router.push(`/wizard/type-a/preview?id=${contractId}`);
  };

  const handleContinue = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    if (contract) {
      const store = useWizardStore.getState();
      store.setDraftId(contractId);
      store.setSourceContractStatus(contract.status);
    }
    router.push(`/wizard/type-a/preview?id=${contractId}`);
  };

  const handleCopyLink = async (contractId: string) => {
    if (typeof window === 'undefined') return;
    const signUrl = `${window.location.origin}/sign/${contractId}`;
    try {
      await navigator.clipboard.writeText(signUrl);
      alert('서명 링크가 복사되었습니다. 강사님께 전달해주세요.');
      // 서명 요청 전송 시 상태를 pending_signature로 변경
      if (user) {
        const targetContract = contracts.find((c) => c.id === contractId);
        if (targetContract && targetContract.status === 'draft') {
          await supabase
            .from('contracts')
            .update({ status: 'pending_signature' })
            .eq('id', contractId)
            .eq('user_id', user.id);
          await loadContracts(user.id);
        }
      }
    } catch (error) {
      console.error('서명 링크 복사 실패:', error);
      alert('서명 링크 복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleSendSignKakao = async (contractId: string) => {
    if (typeof window === 'undefined') return;
    const signUrl = `${window.location.origin}/sign/${contractId}`;
    const kakao = (window as any).Kakao;

    if (!kakao) {
      alert('카카오 전송 기능을 준비 중입니다. 링크 복사를 이용해주세요.');
      return;
    }

    try {
      if (kakao && !kakao.isInitialized?.() && kakaoKey) {
        try {
          kakao.init(kakaoKey);
        } catch (error) {
          setKakaoInitFailed(true);
          setKakaoDisabledReason('init 실패');
          throw error;
        }
      }
      if (kakao?.isInitialized?.()) {
        kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '[학온] 계약서 서명 요청',
            description: '잠룡승천학원에서 계약서 서명을 요청했습니다. 아래 버튼을 눌러 서명을 진행해 주세요.',
            imageUrl: kakaoLogoUrl,
            link: {
              webUrl: signUrl,
              mobileWebUrl: signUrl,
            },
          },
          buttons: [
            {
              title: '서명하러 가기',
              link: {
                webUrl: signUrl,
                mobileWebUrl: signUrl,
              },
            },
          ],
        });
        // 서명 요청 전송 시 상태를 pending_signature로 변경
        if (user) {
          const targetContract = contracts.find((c) => c.id === contractId);
          if (targetContract && targetContract.status === 'draft') {
            await supabase
              .from('contracts')
              .update({ status: 'pending_signature' })
              .eq('id', contractId)
              .eq('user_id', user.id);
            await loadContracts(user.id);
          }
        }
        return;
      }
    } catch (error) {
      console.warn('카카오 공유 실패:', error);
    }

    alert('카카오 전송에 실패했습니다. 링크 복사를 이용해주세요.');
  };

  const handleDownloadPdf = (contractId: string) => {
    if (typeof window === 'undefined') return;
    window.open(`/wizard/type-a/preview?id=${contractId}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyCompletionLink = async (contractId: string) => {
    if (typeof window === 'undefined') return;
    const viewUrl = `https://hagon-cloud.vercel.app/view/${contractId}`;
    try {
      await navigator.clipboard.writeText(viewUrl);
      alert('완료본 링크가 복사되었습니다.');
    } catch (error) {
      console.error('완료본 링크 복사 실패:', error);
      alert('링크 복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleSendCompletionKakao = async (contractId: string) => {
    if (typeof window === 'undefined') return;
    const viewUrl = `https://hagon-cloud.vercel.app/view/${contractId}`;
    const kakao = (window as any).Kakao;

    if (!kakao) {
      alert('카카오 전송 기능을 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      if (kakao && !kakao.isInitialized?.() && kakaoKey) {
        try {
          kakao.init(kakaoKey);
        } catch (error) {
          setKakaoInitFailed(true);
          setKakaoDisabledReason('init 실패');
          throw error;
        }
      }
      if (kakao?.isInitialized?.()) {
        kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '[학온] 전자계약 체결 완료 안내',
            description: '계약이 성공적으로 체결되었습니다. 최종본을 확인하세요.',
            imageUrl: kakaoLogoUrl,
            link: {
              webUrl: viewUrl,
              mobileWebUrl: viewUrl,
            },
          },
          buttons: [
            {
              title: '계약서 보기',
              link: {
                webUrl: viewUrl,
                mobileWebUrl: viewUrl,
              },
            },
          ],
        });
        return;
      }
    } catch (error) {
      console.warn('카카오 공유 실패:', error);
    }

    try {
      await navigator.clipboard.writeText(viewUrl);
      if (kakaoDisabledReason) {
        alert(`카톡 전송이 불가하여 링크 복사로 전송했습니다. (사유: ${kakaoDisabledReason})`);
      } else {
        alert('카톡 전송 대신 링크가 복사되었습니다.');
      }
    } catch (error) {
      console.error('완료본 링크 복사 실패:', error);
      alert('링크 복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const tableColSpan = 7;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getContractPeriod = (contractData: Contract['contract_data']) => {
    const startDate = contractData?.contract_period?.start_date || contractData?.contractPeriod?.startDate;
    const endDate = contractData?.contract_period?.end_date || contractData?.contractPeriod?.endDate;
    if (!startDate && !endDate) return '-';
    const formatShort = (d: string) => {
      const date = new Date(d);
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };
    if (startDate && endDate) return `${formatShort(startDate)} ~ ${formatShort(endDate)}`;
    if (startDate) return `${formatShort(startDate)} ~`;
    return `~ ${formatShort(endDate!)}`;
  };

  const getSignatureStatus = (contract: Contract) => {
    if (contract.signed_at) {
      return <span className="text-green-600 font-medium">✅ 서명완료</span>;
    }
    if (contract.status === 'pending_signature') {
      return <span className="text-yellow-600 font-medium">⏳ 대기중</span>;
    }
    return <span className="text-gray-400">-</span>;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}년 ${mm}월 ${dd}일 ${hh}:${min}`;
  };

  const getContractName = (contractData: Contract['contract_data']) => {
    const academyName = contractData.academy?.name || '(학원명 없음)';
    const instructorName = contractData.instructor?.name || '(강사명 없음)';
    return `${academyName} - ${instructorName}`;
  };

  const getInstructorName = (contractData: Contract['contract_data']) => {
    return contractData.instructor?.name || '(강사명 없음)';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: '작성중', className: 'bg-gray-100 text-gray-800' },
      pending_signature: { label: '서명대기', className: 'bg-yellow-100 text-yellow-800' },
      signed: { label: '체결완료', className: 'bg-green-100 text-green-800' },
      expired: { label: '만료', className: 'bg-orange-100 text-orange-800' },
      cancelled: { label: '취소', className: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const draftContracts = contracts.filter((c) => c.status === 'draft');
  const pendingContracts = contracts.filter((c) => c.status === 'pending_signature');
  const signedContracts = contracts.filter((c) => c.status === 'signed');
  const expiringSoonContracts = contracts.filter((c) => {
    if (c.status !== 'signed') return false;
    const endDate = c.contract_data?.contract_period?.end_date || c.contract_data?.contractPeriod?.endDate;
    if (!endDate) return false;
    const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 30;
  });

  const ongoingContracts = contracts.filter((c) => c.status !== 'signed' && c.status !== 'cancelled');
  const completedContracts = contracts.filter((c) => c.status === 'signed');
  const filteredOngoingContracts = ongoingContracts.filter((contract) =>
    getInstructorName(contract.contract_data).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCompletedContracts = completedContracts.filter((contract) =>
    getInstructorName(contract.contract_data).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <h1><span style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl font-bold tracking-tight">hag<span className="text-hagon-blue">on</span></span></h1>
              <span className="text-sm text-gray-500 hidden sm:inline">대시보드</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/devdocs')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="개발문서"
              >
                <FileText size={20} className="text-gray-500" />
              </button>
              <button
                onClick={handleCreateContract}
                className="bg-[#FFD85C] hover:bg-[#f5c84a] text-black px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm text-sm"
              >
                + 새 계약서
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 현황 알림 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div
            onClick={() => setActiveTab('in-progress')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-sm text-gray-500 mb-1">⏳ 서명 대기</div>
            <div className="text-2xl font-bold text-yellow-600">{pendingContracts.length}건</div>
          </div>
          <div
            onClick={() => setActiveTab('in-progress')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-sm text-gray-500 mb-1">⚠️ 만료 임박</div>
            <div className="text-2xl font-bold text-orange-600">{expiringSoonContracts.length}건</div>
            <div className="text-xs text-gray-400 mt-1">30일 이내</div>
          </div>
          <div
            onClick={() => setActiveTab('in-progress')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-sm text-gray-500 mb-1">📝 작성중</div>
            <div className="text-2xl font-bold text-gray-600">{draftContracts.length}건</div>
          </div>
          <div
            onClick={() => setActiveTab('completed')}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-sm text-gray-500 mb-1">✅ 전체 체결</div>
            <div className="text-2xl font-bold text-green-600">{signedContracts.length}건</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 pt-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setActiveTab('in-progress');
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'in-progress'
                    ? 'border-navy text-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                진행중
              </button>
              <button
                onClick={() => {
                  setActiveTab('completed');
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'completed'
                    ? 'border-navy text-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                체결완료
              </button>

              {/* 일괄 삭제 버튼 - 선택된 항목이 있을 때만 표시 */}
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setBulkDeleteModalOpen(true)}
                  className="ml-auto px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  선택 삭제 ({selectedIds.size}건)
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="강사명 검색"
              className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/40"
            />
          </div>

          {/* 모바일 카드 리스트 */}
          <div className="md:hidden divide-y divide-gray-200">
            {contractsLoading ? (
              <div className="px-4 py-12 text-center text-gray-500">로딩 중...</div>
            ) : activeTab === 'in-progress' ? (
              filteredOngoingContracts.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500">진행 중인 계약이 없습니다.</div>
              ) : (
                filteredOngoingContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => handleRowClick(contract.id)}
                    className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900">
                        {getInstructorName(contract.contract_data)}
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {getContractPeriod(contract.contract_data)}
                    </div>
                    <div className="text-sm mb-3">
                      {getSignatureStatus(contract)}
                    </div>
                    <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleContinue(contract.id)}
                        className="px-3 py-1.5 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-md text-sm font-semibold"
                      >
                        {contract.status === 'pending_signature' ? '계약서 보기' : '이어서 작성'}
                      </button>
                      <button
                        onClick={() => handleSendSignKakao(contract.id)}
                        className="px-3 py-1.5 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-md text-sm font-semibold disabled:opacity-60"
                        disabled={!kakaoReady}
                      >
                        카톡 요청
                      </button>
                      <button
                        onClick={() => handleCopyLink(contract.id)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
                      >
                        링크 복사
                      </button>
                      <button
                        onClick={() => handleDeleteClick(contract.id)}
                        className="px-3 py-1.5 text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : filteredCompletedContracts.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">완료된 계약이 없습니다.</div>
            ) : (
              filteredCompletedContracts.map((contract) => (
                <div
                  key={contract.id}
                  onClick={() => handleRowClick(contract.id)}
                  className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {getInstructorName(contract.contract_data)}
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    {getContractPeriod(contract.contract_data)}
                  </div>
                  <div className="text-sm mb-3">
                    {getSignatureStatus(contract)}
                  </div>
                  <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDownloadPdf(contract.id)}
                      className="px-3 py-1.5 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-md text-sm font-semibold"
                    >
                      계약서 보기
                    </button>
                    <button
                      onClick={() => handleSendCompletionKakao(contract.id)}
                      className="px-3 py-1.5 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-md text-sm font-semibold disabled:opacity-60"
                      disabled={!kakaoReady}
                    >
                      카톡 완료본
                    </button>
                    <button
                      onClick={() => handleCopyCompletionLink(contract.id)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
                    >
                      링크 복사
                    </button>
                    <button
                      onClick={() => handleDeleteClick(contract.id)}
                      className="px-3 py-1.5 text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={(() => {
                        const currentList =
                          activeTab === 'in-progress' ? filteredOngoingContracts : filteredCompletedContracts;
                        return currentList.length > 0 && currentList.every((c) => selectedIds.has(c.id));
                      })()}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-navy border-gray-300 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    강사명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    계약기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    서명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전송
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contractsLoading ? (
                  <tr>
                    <td colSpan={tableColSpan} className="px-6 py-12 text-center text-gray-500">
                      계약서 목록을 불러오는 중...
                    </td>
                  </tr>
                ) : contractsError ? (
                  <tr>
                    <td colSpan={tableColSpan} className="px-6 py-12 text-center">
                      <div className="text-red-600 mb-2">{contractsError}</div>
                      <button
                        onClick={() => {
                          if (user) {
                            window.location.reload();
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        다시 시도
                      </button>
                    </td>
                  </tr>
                ) : activeTab === 'in-progress' ? (
                  filteredOngoingContracts.length === 0 ? (
                    <tr>
                      <td colSpan={tableColSpan} className="px-6 py-12 text-center text-gray-500">
                        진행 중인 계약이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredOngoingContracts.map((contract) => (
                      <tr
                        key={contract.id}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest('button')) return;
                          handleRowClick(contract.id);
                        }}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(contract.id)}
                            onChange={() => toggleSelect(contract.id)}
                            className="w-4 h-4 text-navy border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        {/* 강사명 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getInstructorName(contract.contract_data)}
                        </td>
                        {/* 계약기간 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getContractPeriod(contract.contract_data)}
                        </td>
                        {/* 상태 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getStatusBadge(contract.status)}
                        </td>
                        {/* 서명 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getSignatureStatus(contract)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContinue(contract.id);
                              }}
                              className="px-3 py-1.5 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-md font-semibold transition-colors"
                            >
                              {contract.status === 'pending_signature' ? '계약서 보기' : '이어서 작성'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(contract.id);
                              }}
                              className="text-red-600 hover:text-red-800 font-medium transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendSignKakao(contract.id);
                              }}
                              className="px-3 py-1.5 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-md font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={!kakaoReady}
                            >
                              카톡 요청 전송
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(contract.id);
                              }}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                            >
                              링크 복사
                            </button>
                          </div>
                          {!kakaoReady && (
                            <div className="mt-1 text-[11px] text-gray-500">
                              {kakaoDisabledReason}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )
                ) : filteredCompletedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className="px-6 py-12 text-center text-gray-500">
                      완료된 계약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredCompletedContracts.map((contract) => (
                    <tr
                      key={contract.id}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest('button')) return;
                        handleRowClick(contract.id);
                      }}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contract.id)}
                          onChange={() => toggleSelect(contract.id)}
                          className="w-4 h-4 text-navy border-gray-300 rounded cursor-pointer"
                        />
                      </td>
                      {/* 강사명 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getInstructorName(contract.contract_data)}
                      </td>
                      {/* 계약기간 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getContractPeriod(contract.contract_data)}
                      </td>
                      {/* 상태 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(contract.status)}
                      </td>
                      {/* 서명 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getSignatureStatus(contract)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdf(contract.id);
                            }}
                            className="px-3 py-1.5 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-md font-semibold transition-colors"
                          >
                            계약서 보기
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(contract.id);
                            }}
                            className="text-red-600 hover:text-red-800 font-medium transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendCompletionKakao(contract.id);
                            }}
                            className="px-3 py-1.5 bg-[#FFE812] hover:bg-[#f5d400] text-black rounded-md font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!kakaoReady}
                          >
                            카톡 완료본 전송
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCompletionLink(contract.id);
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                          >
                            링크 복사로 전송
                          </button>
                        </div>
                        {!kakaoReady && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            {kakaoDisabledReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">계약서 삭제</h3>
            <p className="text-gray-600 mb-6">정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">계약서 일괄 삭제</h3>
            <p className="text-gray-600 mb-6">
              선택한 <span className="font-bold text-red-600">{selectedIds.size}건</span>의 계약서를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? '삭제 중...' : `${selectedIds.size}건 삭제`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

