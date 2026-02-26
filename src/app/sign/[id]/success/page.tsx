'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function SignSuccessPage() {
  const params = useParams<{ id: string }>();
  const contractId = params?.id;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center space-y-5">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-navy">서명이 완료되었습니다</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          계약이 성공적으로 체결되었습니다.
          <br />
          계약서는 학온 보관함에 안전하게 저장되었으며,
          <br />
          아래 버튼을 눌러 체결된 계약서를 확인하실 수 있습니다.
        </p>

        {contractId && (
          <Link
            href={`/view/${contractId}`}
            className="block w-full px-6 py-3 bg-[#FFD85C] hover:bg-[#f5c84a] text-black rounded-xl font-semibold transition-colors"
          >
            체결된 계약서 보기
          </Link>
        )}

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            본 계약서는 학온(HAGON) 전자계약 시스템을 통해 체결되었으며,
            <br />
            서명 일시와 IP가 기록되어 법적 효력을 갖습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

