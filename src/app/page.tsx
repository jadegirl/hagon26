'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, Users, Smartphone, FileText } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isRiskDiagnosisOpen, setIsRiskDiagnosisOpen] = useState(false);
  const [riskStep, setRiskStep] = useState(1);
  const [salaryType, setSalaryType] = useState<'fixed' | 'ratio' | 'hourly' | null>(null);
  const [riskAnswers, setRiskAnswers] = useState<boolean[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 이메일 제출 로직 (추후 구현)
    console.log('Email submitted:', email);
    alert('사전 알림 신청이 완료되었습니다!');
    setEmail('');
  };

  // 리스크 진단 질문 데이터
  const getRiskQuestions = () => {
    if (salaryType === 'fixed') {
      return [
        { text: "계약서에 '주휴수당'을 별도로 명시하고 있나요?", score: 35 },
        { text: "포괄임금제의 위험성을 알고 계신가요?", score: 30 },
        { text: "경업금지약정 대가를 별도로 지급하고 있나요?", score: 20 },
        { text: "계약서를 1년마다 새로운 내용으로 갱신하고 있나요?", score: 15 },
        { text: "계약서에 퇴직금에 대한 내용이 명시되어 있나요?", score: 25 },
      ];
    } else if (salaryType === 'ratio') {
      return [
        { text: "비율제에도 최저임금이 적용된다는 걸 알고 계신가요?", score: 35 },
        { text: "포괄임금제의 위험성을 알고 계신가요?", score: 30 },
        { text: "경업금지약정 대가를 별도로 지급하고 있나요?", score: 20 },
        { text: "계약서를 1년마다 새로운 내용으로 갱신하고 있나요?", score: 15 },
        { text: "계약서에 퇴직금에 대한 내용이 명시되어 있나요?", score: 25 },
      ];
    } else if (salaryType === 'hourly') {
      return [
        { text: "주당 근로시간이 15시간 이상인 경우 주휴수당을 별도로 지급하고 있나요?", score: 35 },
        { text: "총 계약기간이 2년 이상일 경우 무기계약직 전환 의무를 알고 계신가요?", score: 30 },
        { text: "기간제 및 단시간근로자 보호 등에 관한 법률에 대해 알고 계신가요?", score: 20 },
        { text: "계약서를 1년마다 새로운 내용으로 갱신하고 있나요?", score: 15 },
        { text: "계약서에 퇴직금에 대한 내용이 명시되어 있나요?", score: 25 },
      ];
    }
    return [];
  };

  // 리스크 등급 및 메시지
  const getRiskGrade = (score: number) => {
    if (score === 0) {
      return { icon: '🟢', level: '안전', message: '잘 관리하고 계시네요. 학온으로 더 체계적으로 관리해보세요.' };
    } else if (score >= 15 && score <= 30) {
      return { icon: '🟡', level: '주의', message: '몇 가지 개선이 필요합니다.' };
    } else if (score >= 35 && score <= 65) {
      return { icon: '🟠', level: '경고', message: '분쟁 발생 시 불리할 수 있는 요소가 있습니다.' };
    } else {
      return { icon: '🔴', level: '위험', message: '지금 계약 방식은 분쟁에 취약합니다. 즉시 점검이 필요합니다.' };
    }
  };

  // 위험 항목 설명
  const getRiskDescriptions = () => {
    const descriptions: string[] = [];
    const questions = getRiskQuestions();
    
    riskAnswers.forEach((answer, index) => {
      if (!answer && questions[index]) {
        if (salaryType === 'fixed') {
          if (index === 0) descriptions.push('주휴수당 미명시: 퇴사 시 소급 청구 대상이 될 수 있습니다');
          if (index === 1) descriptions.push('포괄임금제 위험 미인지: 2026년 제도 변경 시 기존 계약이 무효화될 수 있습니다');
          if (index === 2) descriptions.push('경업금지 대가 미지급: 대가 없는 경업금지 약정은 무효 판결 가능성이 높습니다');
          if (index === 3) descriptions.push('계약서 미갱신: 오래된 계약서는 변경된 법률 기준에 맞지 않을 수 있습니다');
          if (index === 4) descriptions.push('퇴직금 미명시: 1년 이상 근무 시 퇴직금 지급 의무가 있으며, 미명시 시 분쟁 소지가 있습니다');
        } else if (salaryType === 'ratio') {
          if (index === 0) descriptions.push('최저임금 적용 미인지: 최저임금 미달 시 임금체불에 해당합니다');
          if (index === 1) descriptions.push('포괄임금제 위험 미인지: 2026년 제도 변경 시 기존 계약이 무효화될 수 있습니다');
          if (index === 2) descriptions.push('경업금지 대가 미지급: 대가 없는 경업금지 약정은 무효 판결 가능성이 높습니다');
          if (index === 3) descriptions.push('계약서 미갱신: 오래된 계약서는 변경된 법률 기준에 맞지 않을 수 있습니다');
          if (index === 4) descriptions.push('퇴직금 미명시: 1년 이상 근무 시 퇴직금 지급 의무가 있으며, 미명시 시 분쟁 소지가 있습니다');
        } else if (salaryType === 'hourly') {
          if (index === 0) descriptions.push('주휴수당 미지급: 주당 15시간 이상 근로 시 주휴수당 지급 의무가 있습니다');
          if (index === 1) descriptions.push('무기계약 전환 미인지: 2년 초과 시 무기계약 전환 의무가 발생합니다');
          if (index === 2) descriptions.push('기단법 미인지: 단시간 근로자 보호 의무 위반 시 과태료 부과 대상입니다');
          if (index === 3) descriptions.push('계약서 미갱신: 오래된 계약서는 변경된 법률 기준에 맞지 않을 수 있습니다');
          if (index === 4) descriptions.push('퇴직금 미명시: 1년 이상 근무 시 퇴직금 지급 의무가 있으며, 미명시 시 분쟁 소지가 있습니다');
        }
      }
    });
    
    return descriptions;
  };

  // 급여 유형 선택
  const selectSalaryType = (type: 'fixed' | 'ratio' | 'hourly') => {
    setSalaryType(type);
    setRiskStep(2);
    setRiskAnswers([]);
    setSelectedAnswer(null);
  };

  // 질문 답변
  const selectAnswer = (answer: boolean) => {
    const newAnswers = [...riskAnswers, answer];
    setRiskAnswers(newAnswers);
    
    if (newAnswers.length < 5) {
      setRiskStep(riskStep + 1);
    } else {
      // 모든 질문 답변 완료, 점수 계산
      const questions = getRiskQuestions();
      let score = 0;
      newAnswers.forEach((ans, index) => {
        if (!ans && questions[index]) {
          score += questions[index].score;
        }
      });
      setRiskScore(score);
      setRiskStep(7); // 5문항이니까 결과는 step 7
    }
  };

  const goToPreviousQuestion = () => {
    if (riskStep > 2) {
      setRiskStep(riskStep - 1);
      setRiskAnswers(riskAnswers.slice(0, -1));
    } else {
      setRiskStep(1);
      setSalaryType(null);
      setRiskAnswers([]);
    }
  };

  const resetRiskDiagnosis = () => {
    setIsRiskDiagnosisOpen(false);
    setRiskStep(1);
    setSalaryType(null);
    setRiskAnswers([]);
    setRiskScore(0);
    setSelectedAnswer(null);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <span style={{ fontFamily: "'Sora', sans-serif" }} className="text-2xl font-bold tracking-tight">hag<span className="text-hagon-blue">on</span></span>
            <nav className="hidden md:flex space-x-8 items-center">
              <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition">기능</a>
              <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition">가격</a>
              <Link
                href="/devdocs"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="개발문서"
              >
                <FileText size={18} className="text-gray-500" />
              </Link>
              <Link
                href="/login"
                className="bg-hagon-blue text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-hagon-navy transition"
              >
                시작하기
              </Link>
            </nav>
            <div className="md:hidden">
              <Link
                href="/login"
                className="bg-hagon-blue text-white px-4 py-2 rounded-full text-sm font-semibold"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center" style={{ wordBreak: 'keep-all' }}>
            <div className="inline-flex items-center gap-2 bg-hagon-cream px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 bg-hagon-gold rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-hagon-blue">1,200건 분쟁 데이터 기반</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-hagon-text leading-tight mb-6" style={{ wordBreak: 'keep-all' }}>
              학원 계약의
              <br />
              <span className="text-hagon-blue">새로운 표준</span>
            </h1>

            <p className="text-lg md:text-xl text-hagon-sub mb-10 max-w-xl mx-auto" style={{ wordBreak: 'keep-all' }}>
              복잡한 법률 검토는 학온에게 맡기고,
              <br className="hidden md:block" />
              원장님은 학원 운영에만 집중하세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Link
                href="/login"
                className="bg-hagon-blue text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-hagon-navy transition-all shadow-lg shadow-hagon-blue/20 hover:shadow-xl hover:shadow-hagon-blue/30"
                style={{ wordBreak: 'keep-all' }}
              >
                무료로 시작하기
              </Link>
              <button
                onClick={() => setIsRiskDiagnosisOpen(true)}
                className="bg-white text-hagon-text px-8 py-4 rounded-2xl text-lg font-semibold border-2 border-gray-200 hover:border-hagon-blue hover:text-hagon-blue transition-all"
                style={{ wordBreak: 'keep-all' }}
              >
                리스크 무료 진단
              </button>
            </div>

            <p className="text-sm text-hagon-sub">
              신용카드 등록 없이 · 3분이면 첫 계약서 완성
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16" style={{ wordBreak: 'keep-all' }}>
              <p className="text-sm font-semibold text-hagon-blue tracking-wide uppercase mb-3">Core Features</p>
              <h2 className="text-2xl md:text-4xl font-bold text-hagon-text" style={{ wordBreak: 'keep-all' }}>
                분쟁을 막는 4가지 핵심 기능
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-hagon-slate p-8 rounded-3xl hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-hagon-sky rounded-2xl flex items-center justify-center mb-5">
                  <RefreshCw className="w-7 h-7 text-hagon-blue" />
                </div>
                <h3 className="text-lg font-bold text-hagon-text mb-3" style={{ wordBreak: 'keep-all' }}>최신 법률 자동 업데이트</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  수시로 바뀌는 학원법과 노동법, 매번 확인하실 필요 없습니다. 학온이 실시간으로 반영합니다.
                </p>
              </div>

              <div className="bg-hagon-slate p-8 rounded-3xl hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-hagon-sky rounded-2xl flex items-center justify-center mb-5">
                  <AlertTriangle className="w-7 h-7 text-hagon-blue" />
                </div>
                <h3 className="text-lg font-bold text-hagon-text mb-3" style={{ wordBreak: 'keep-all' }}>독소 조항 실시간 탐지</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  10년의 학원가 분쟁 사례를 분석한 엔진이 리스크 조항을 실시간 탐지하고 안전한 대안을 제시합니다.
                </p>
              </div>

              <div className="bg-hagon-slate p-8 rounded-3xl hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-hagon-sky rounded-2xl flex items-center justify-center mb-5">
                  <Users className="w-7 h-7 text-hagon-blue" />
                </div>
                <h3 className="text-lg font-bold text-hagon-text mb-3" style={{ wordBreak: 'keep-all' }}>강사별 계약 이력 통합 관리</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  흩어져 있는 강사 계약서와 이력을 한눈에. 인력 관리의 리스크를 데이터로 체계화합니다.
                </p>
              </div>

              <div className="bg-hagon-slate p-8 rounded-3xl hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-hagon-sky rounded-2xl flex items-center justify-center mb-5">
                  <Smartphone className="w-7 h-7 text-hagon-blue" />
                </div>
                <h3 className="text-lg font-bold text-hagon-text mb-3" style={{ wordBreak: 'keep-all' }}>종이 없는 스마트 전자계약</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  카카오톡이나 링크로 간편하게. 대면 없이 어디서든 체결하고, 안전하게 보관합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-hagon-slate">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-hagon-blue">1,200+</div>
                <div className="text-sm text-hagon-sub mt-2">분쟁 데이터 분석</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-hagon-blue">18가지</div>
                <div className="text-sm text-hagon-sub mt-2">법적 검증 항목</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-hagon-blue">10년</div>
                <div className="text-sm text-hagon-sub mt-2">학원 법률 경험</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-hagon-blue">3분</div>
                <div className="text-sm text-hagon-sub mt-2">계약서 완성 시간</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 md:py-28 bg-hagon-cream/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12" style={{ wordBreak: 'keep-all' }}>
              <h2 className="text-2xl md:text-4xl font-bold text-hagon-text" style={{ wordBreak: 'keep-all' }}>
                이런 고민, 하고 계시지 않나요?
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-red-100">
                <span className="text-2xl mb-3 block">😓</span>
                <h3 className="font-bold text-base mb-2" style={{ wordBreak: 'keep-all' }}>&ldquo;지금 계약서, 계속 써도 될까?&rdquo;</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>수년 전 양식이나 출처 불분명한 계약서를 쓰고 계신가요? 최신 법령이 반영되지 않은 계약서는 예상치 못한 리스크로 돌아옵니다.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-red-100">
                <span className="text-2xl mb-3 block">😰</span>
                <h3 className="font-bold text-base mb-2" style={{ wordBreak: 'keep-all' }}>&ldquo;포괄임금제가 뭔지 몰라서...&rdquo;</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>대형학원은 법무팀이 꼼꼼히 검토하지만, 일반 학원은 인터넷 서식을 복사해 쓰기 바쁜 게 현실입니다.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-red-100">
                <span className="text-2xl mb-3 block">😤</span>
                <h3 className="font-bold text-base mb-2" style={{ wordBreak: 'keep-all' }}>&ldquo;법률 자문, 받기엔 너무 부담돼요&rdquo;</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>제대로 된 검토를 받고 싶어도 매번 발생하는 비용이 아깝고, 학원 전문 조력자를 찾기 어렵습니다.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-red-100">
                <span className="text-2xl mb-3 block">😱</span>
                <h3 className="font-bold text-base mb-2" style={{ wordBreak: 'keep-all' }}>&ldquo;퇴사한 강사가 고소를...&rdquo;</h3>
                <p className="text-sm text-hagon-sub leading-relaxed" style={{ wordBreak: 'keep-all' }}>최저임금 미달, 주휴수당 누락으로 퇴사 후 수천만 원을 배상하는 원장님들이 많습니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14" style={{ wordBreak: 'keep-all' }}>
              <h2 className="text-2xl md:text-4xl font-bold text-hagon-text mb-4" style={{ wordBreak: 'keep-all' }}>
                학온이 이 모든 걱정을 없애드립니다
              </h2>
              <p className="text-lg text-hagon-sub" style={{ wordBreak: 'keep-all' }}>
                학원 분쟁을 사전에 차단하는 시스템
              </p>
            </div>

            <div className="space-y-5">
              <div className="bg-hagon-sky p-6 md:p-8 rounded-2xl flex items-start gap-5">
                <div className="w-12 h-12 bg-hagon-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-white">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-hagon-text mb-2" style={{ wordBreak: 'keep-all' }}>18가지 법적 리스크 자동 검증</h3>
                  <p className="text-sm text-hagon-sub" style={{ wordBreak: 'keep-all' }}>최저임금, 주휴수당, 포괄임금제 유효성까지. 입력만 하면 학온이 알아서 확인합니다.</p>
                </div>
              </div>

              <div className="bg-hagon-sky p-6 md:p-8 rounded-2xl flex items-start gap-5">
                <div className="w-12 h-12 bg-hagon-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-white">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-hagon-text mb-2" style={{ wordBreak: 'keep-all' }}>3분 만에 완성되는 표준계약서</h3>
                  <p className="text-sm text-hagon-sub" style={{ wordBreak: 'keep-all' }}>복잡한 법률 용어? 몰라도 됩니다. 질문에 답하면 완벽한 계약서가 완성됩니다.</p>
                </div>
              </div>

              <div className="bg-hagon-sky p-6 md:p-8 rounded-2xl flex items-start gap-5">
                <div className="w-12 h-12 bg-hagon-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-white">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-hagon-text mb-2" style={{ wordBreak: 'keep-all' }}>실시간 법률 업데이트</h3>
                  <p className="text-sm text-hagon-sub" style={{ wordBreak: 'keep-all' }}>바뀌는 최저임금, 새로운 판례. 학온이 자동으로 반영해서 항상 최신 상태를 유지합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 md:py-28 bg-hagon-slate">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14" style={{ wordBreak: 'keep-all' }}>
              <h2 className="text-2xl md:text-4xl font-bold text-hagon-text" style={{ wordBreak: 'keep-all' }}>
                입력하고, 검증받고, 다운로드
              </h2>
              <p className="text-lg text-hagon-sub mt-4" style={{ wordBreak: 'keep-all' }}>
                3분이면 완성되는 표준 계약서
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-hagon-sky rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className="font-bold text-base mb-2">STEP 1</h3>
                <p className="text-sm text-hagon-sub" style={{ wordBreak: 'keep-all' }}>강사 정보와 급여 조건 입력 (3분)</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-hagon-sky rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="font-bold text-base mb-2">STEP 2</h3>
                <p className="text-sm text-hagon-sub" style={{ wordBreak: 'keep-all' }}>학온이 자동으로 법적 검증 (즉시)</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-hagon-sky rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="font-bold text-base mb-2">STEP 3</h3>
                <p className="text-sm text-hagon-sub" style={{ wordBreak: 'keep-all' }}>완성된 계약서 다운로드 (즉시)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14" style={{ wordBreak: 'keep-all' }}>
              <h2 className="text-2xl md:text-4xl font-bold text-hagon-text" style={{ wordBreak: 'keep-all' }}>
                합리적인 가격, 전문가의 검증
              </h2>
              <p className="text-lg text-hagon-sub mt-4" style={{ wordBreak: 'keep-all' }}>
                학원 운영에만 집중하실 수 있도록
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-gray-200" style={{ wordBreak: 'keep-all' }}>
                <h3 className="text-lg font-bold mb-2">체험판</h3>
                <div className="text-4xl font-bold mb-1">무료</div>
                <p className="text-sm text-hagon-sub mb-6">현재 모든 기능 무료</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-blue font-bold">✓</span> 학온의 모든 기능
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-blue font-bold">✓</span> 한 달 무료 체험
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-blue font-bold">✓</span> 신용카드 등록 불필요
                  </li>
                </ul>
                <Link
                  href="/login"
                  className="block w-full text-center py-3.5 rounded-xl border-2 border-gray-200 text-hagon-text font-semibold hover:border-hagon-blue hover:text-hagon-blue transition text-sm"
                >
                  무료 체험하기
                </Link>
              </div>

              <div className="bg-hagon-blue p-8 rounded-3xl text-white relative" style={{ wordBreak: 'keep-all' }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-hagon-gold text-hagon-text text-xs font-bold px-4 py-1 rounded-full">
                  추천
                </div>
                <h3 className="text-lg font-bold mb-2">프로</h3>
                <div className="text-4xl font-bold mb-1">
                  Coming Soon
                </div>
                <p className="text-sm opacity-80 mb-6">오픈 기념 무료 체험 중</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-gold font-bold">✓</span> 월 30건 계약서 작성
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-gold font-bold">✓</span> 18가지 법적 검증
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-gold font-bold">✓</span> 계약서 보관함
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-gold font-bold">✓</span> 갱신 알림
                  </li>
                </ul>
                <Link
                  href="/login"
                  className="block w-full text-center py-3.5 rounded-xl bg-hagon-gold text-hagon-text font-semibold hover:bg-hagon-goldHover transition text-sm"
                >
                  지금 시작하기
                </Link>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-200" style={{ wordBreak: 'keep-all' }}>
                <h3 className="text-lg font-bold mb-2">엔터프라이즈</h3>
                <div className="text-4xl font-bold mb-1">문의</div>
                <p className="text-sm text-hagon-sub mb-6">학원관리 프로그램 연동</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-blue font-bold">✓</span> 프로의 모든 기능
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-blue font-bold">✓</span> 맞춤 계약서 템플릿
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="text-hagon-blue font-bold">✓</span> 전담 지원
                  </li>
                </ul>
                <button className="w-full text-center py-3.5 rounded-xl border-2 border-gray-200 text-hagon-text font-semibold hover:border-hagon-blue hover:text-hagon-blue transition text-sm">
                  문의하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 bg-hagon-slate">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold text-center mb-12 text-hagon-text" style={{ wordBreak: 'keep-all' }}>
              원장님들의 이야기
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl">
                <div className="flex items-center gap-1 mb-4">
                  <span className="text-hagon-gold text-lg">★★★★★</span>
                </div>
                <p className="text-sm text-gray-700 mb-5 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  &ldquo;강사 계약서 때문에 밤잠 못 이루던 게 얼마나 오래됐는지... 학온 덕분에 이제는 3분이면 끝나요. 법적 검증까지 자동으로 해주니 정말 안심이 됩니다.&rdquo;
                </p>
                <p className="text-sm font-semibold text-hagon-sub">대치동 ○○수학학원 원장</p>
              </div>

              <div className="bg-white p-8 rounded-3xl">
                <div className="flex items-center gap-1 mb-4">
                  <span className="text-hagon-gold text-lg">★★★★★</span>
                </div>
                <p className="text-sm text-gray-700 mb-5 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  &ldquo;예전에 퇴사한 강사한테 주휴수당 문제로 500만원 물어준 적 있어요. 그 뒤로 학온 쓰는데, 이런 실수 완전히 사라졌습니다.&rdquo;
                </p>
                <p className="text-sm font-semibold text-hagon-sub">목동 ○○영어학원 원장</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 bg-hagon-blue">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4" style={{ wordBreak: 'keep-all' }}>
              지금 시작하세요
            </h2>
            <p className="text-lg text-white/70 mb-10" style={{ wordBreak: 'keep-all' }}>
              3분이면 첫 번째 계약서가 완성됩니다
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="bg-hagon-gold text-hagon-text px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-hagon-goldHover transition-all"
                style={{ wordBreak: 'keep-all' }}
              >
                무료로 시작하기
              </Link>
            </div>

            <p className="text-sm text-white/50 mt-6">
              신용카드 등록 없이 · 한 달 무료 체험
            </p>
          </div>
        </div>
      </section>

      {/* Risk Diagnosis Modal */}
      {isRiskDiagnosisOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {riskStep === 1 && (
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">계약서 리스크 진단</h2>
                  <button
                    onClick={resetRiskDiagnosis}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-600 mb-8">
                  강사 급여 유형을 선택해주세요. 선택하신 유형에 맞는 리스크를 진단해드립니다.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => selectSalaryType('fixed')}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-[#FFD85C] hover:bg-[#FFD85C]/10 transition text-left"
                  >
                    <h3 className="font-bold text-lg mb-2">고정급</h3>
                    <p className="text-gray-600">월급, 주급 등 고정된 금액으로 지급</p>
                  </button>
                  <button
                    onClick={() => selectSalaryType('ratio')}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-[#FFD85C] hover:bg-[#FFD85C]/10 transition text-left"
                  >
                    <h3 className="font-bold text-lg mb-2">비율급</h3>
                    <p className="text-gray-600">수강생 수나 매출에 비례하여 지급</p>
                  </button>
                  <button
                    onClick={() => selectSalaryType('hourly')}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-[#FFD85C] hover:bg-[#FFD85C]/10 transition text-left"
                  >
                    <h3 className="font-bold text-lg mb-2">시급</h3>
                    <p className="text-gray-600">시간당 금액으로 지급</p>
                  </button>
                </div>
              </div>
            )}

            {riskStep >= 2 && riskStep <= 6 && (
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">계약서 리스크 진단</h2>
                  <button
                    onClick={resetRiskDiagnosis}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>질문 {riskStep - 1} / 5</span>
                    <span>{Math.round(((riskStep - 1) / 5) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-hagon-blue h-2 rounded-full transition-all"
                      style={{ width: `${((riskStep - 1) / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-6">
                  {getRiskQuestions()[riskStep - 2]?.text}
                </h3>
                <div className="space-y-4 mb-8">
                  <button
                    onClick={() => selectAnswer(true)}
                    className={`w-full p-4 border-2 rounded-xl transition ${
                      'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    예
                  </button>
                  <button
                    onClick={() => selectAnswer(false)}
                    className={`w-full p-4 border-2 rounded-xl transition ${
                      'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    아니오
                  </button>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={goToPreviousQuestion}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    이전
                  </button>
                </div>
              </div>
            )}

            {riskStep === 7 && (
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">진단 결과</h2>
                  <button
                    onClick={resetRiskDiagnosis}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">{getRiskGrade(riskScore).icon}</div>
                  <h3 className="text-2xl font-bold mb-2">
                    {getRiskGrade(riskScore).level} ({riskScore}점)
                  </h3>
                  <p className="text-gray-600">
                    {getRiskGrade(riskScore).message}
                  </p>
                </div>
                {getRiskDescriptions().length > 0 && (
                  <div className="space-y-4 mb-8">
                    <h4 className="font-bold text-lg">주요 위험 항목</h4>
                    {getRiskDescriptions().map((description, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{description}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={resetRiskDiagnosis}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    닫기
                  </button>
                  <Link
                    href="/login"
                    onClick={resetRiskDiagnosis}
                    className="flex-1 px-6 py-3 bg-hagon-blue text-white hover:bg-hagon-navy rounded-xl font-semibold transition text-center"
                  >
                    안전한 계약서 만들기
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-hagon-navy py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-white mb-4 text-sm">제품</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#features" className="hover:text-white transition">기능</a></li>
                  <li><a href="#pricing" className="hover:text-white transition">가격</a></li>
                  <li><a href="#" className="hover:text-white transition">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white mb-4 text-sm">회사</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition">소개</a></li>
                  <li><a href="#" className="hover:text-white transition">블로그</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white mb-4 text-sm">지원</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition">고객센터</a></li>
                  <li><a href="#" className="hover:text-white transition">문의하기</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white mb-4 text-sm">법적 고지</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition">이용약관</a></li>
                  <li><a href="#" className="hover:text-white transition">개인정보처리방침</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-8 text-center text-gray-500 text-sm">
              <p>&copy; 2026 주식회사 학온 (HAGON). All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
