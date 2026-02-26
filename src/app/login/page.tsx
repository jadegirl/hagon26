'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('비밀번호는 6자 이상이어야 합니다.');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              academy_name: academyName,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('이미 등록된 이메일입니다.');
          } else {
            setError(signUpError.message || '회원가입에 실패했습니다.');
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          if (data.user.identities && data.user.identities.length === 0) {
            setError('이미 등록된 이메일입니다.');
            setLoading(false);
            return;
          }

          if (data.session) {
            router.push('/dashboard');
            router.refresh();
          } else {
            setError(null);
            setSuccessMessage('회원가입이 완료되었습니다! 이메일을 확인해주세요.');
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message || '로그인에 실패했습니다.');
          setLoading(false);
          return;
        }

        if (data.user) {
          // 로그인 성공 - 대시보드 페이지로 리다이렉트
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err) {
      setError('예상치 못한 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-hagon-slate">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="mb-2">
              <span style={{ fontFamily: "'Sora', sans-serif" }} className="text-3xl font-bold tracking-tight">hag<span className="text-hagon-blue">on</span></span>
            </h1>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">{isSignUp ? '회원가입' : '로그인'}</h2>
            <p className="text-gray-600">{isSignUp ? '학온과 함께 안전한 계약을 시작하세요' : '로그인하여 계속하세요'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {isSignUp && (
              <div>
                <label htmlFor="academyName" className="block text-sm font-medium text-gray-700 mb-2">
                  학원명
                </label>
                <input
                  id="academyName"
                  type="text"
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  required={isSignUp}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hagon-blue focus:border-hagon-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="학원명을 입력하세요"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hagon-blue focus:border-hagon-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hagon-blue focus:border-hagon-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={isSignUp}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hagon-blue focus:border-hagon-blue outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-hagon-blue text-white font-semibold rounded-lg hover:bg-hagon-navy transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (isSignUp ? '회원가입 중...' : '로그인 중...') : isSignUp ? '회원가입' : '로그인'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp((prev) => !prev);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-sm text-hagon-blue font-semibold hover:underline"
            >
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

