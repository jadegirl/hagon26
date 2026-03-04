# 학온(HAGON) 개발일지

## 2026-03-04 (화) — 마법사 10단계 → 5단계 리팩토링

### 📌 목표
계약서 마법사를 10페이지에서 5단계로 축소하여 사용자 이탈률 개선

### 📋 배경
- UX 리서치: 멀티스텝 폼 최적 3~7단계 (Eleken, Creative Navy, NNGroup)
- 기존 Step 3(계약유형)은 입력 0개인 빈 화면
- 학원정보는 매번 입력할 필요 없이 설정에서 관리 가능
- 개선안 문서: `docs/07_마법사_개선안.md` (지인 공유용)

### ✅ 완료 항목

#### 5단계 구조 (A안 채택)
```
기존 10페이지 → 5단계:
① 강사정보 (기존 step-1)
② 근무조건 (기존 step-4 계약기간 + step-5 근무시간 병합)
③ 급여 (기존 step-6 이동)
④ 특약 (기존 step-7 이동)
⑤ 검토·완료 (기존 step-8 요약 + preview 미리보기 + complete 저장 탭 병합)
```

#### 신규 생성 파일
- `src/app/settings/page.tsx` (294줄) — 학원정보 CRUD (기존 wizard 루트에서 분리)
- `src/app/wizard/type-a/step-2/page.tsx` (713줄) — 계약기간 + 근무시간 병합
- `src/app/wizard/type-a/step-5/page.tsx` (1056줄) — 요약 탭 + 미리보기 탭 + 저장/서명 액션

#### 수정 파일
- `src/app/wizard/type-a/page.tsx` — 학원정보 폼(404줄) → 게이트웨이(208줄) 변환
- `src/app/wizard/type-a/step-1/page.tsx` — 다음 경로 step-3 → step-2
- `src/app/wizard/type-a/step-3/page.tsx` — 기존 step-6(급여) 복사 + 네비게이션 수정
- `src/app/wizard/type-a/step-4/page.tsx` — 기존 step-7(특약) 복사 + 네비게이션 수정
- `src/components/wizard/ProgressBar.tsx` — 5단계 그룹/라벨 반영
- `src/app/wizard/type-a/layout.tsx` — TOTAL_STEPS=8→5, preview/complete 분기 제거
- `src/app/dashboard/page.tsx` — preview 경로 → /view/[id] 수정

#### 삭제 디렉토리
- `step-3/` (빈 화면), `step-6/`, `step-7/`, `step-8/`, `preview/`, `complete/`

### 🔍 검증
- `npm run build` ✅ 23페이지 전체 컴파일 + 타입 검사 통과
- 네비게이션 흐름: gateway → step-1 → step-2 → step-3 → step-4 → step-5 확인
- LSP 에러 0건

### 💡 향후 작업
- 기존 MVP 코드의 `<select>`, `<input type="date">` → 커스텀 컴포넌트 교체
- `any` 타입 제거 (기존 코드)
- 조건부 렌더링 모달 패턴 수정

---

## 2026-03-04 (화) — 화면 변경이력 탭 추가

### 📌 목표
MVP 고도화 작업의 전/후 화면을 비교할 수 있는 '화면 변경이력' 탭을 개발문서에 추가

### ✅ 완료 항목

#### MVP before 스크린샷 캡쳐
- Playwright로 현재 MVP 화면 4장 캡쳐 → `public/changelog/before/`
  - `01-landing.png` — 랜딩 페이지 (서비스 소개, 기능, 가격표, 리뷰, CTA)
  - `02-login.png` — 로그인 (이메일/비밀번호 폼)
  - `03-dashboard.png` — 대시보드 (통계 카드, 계약 테이블)
  - `04-wizard-step1.png` — 새 계약서 Step 1 (학원정보 입력)

#### 화면 변경이력 UI 구현
- `src/components/ChangelogView.tsx` 생성
  - 화면별 카드 레이아웃 (랜딩/로그인/대시보드/마법사)
  - 각 카드에 "변경 전 / 변경 후" 탭 전환 (파란색/초록색)
  - "변경 후"는 아직 이미지 없으므로 placeholder 표시
  - 라벨 뱃지 (MVP 원본 / 고도화 완료)
  - 다크모드 완전 지원
- `DevDocsClient.tsx` 수정 — changelog 탭일 때 마크다운 대신 ChangelogView 렌더링
- `page.tsx` 수정 — DOC_FILES에 changelog 항목 추가, Camera 아이콘 배정

### 💡 향후 작업
- 고도화 작업 완료 시마다 해당 화면의 after 스크린샷 캡쳐 → `public/changelog/after/`
- ChangelogView.tsx의 SCREENS 배열에 afterImage 경로 업데이트

---

---

## 2026-03-04 (화) — 플로우차트 TeamPro 스타일 전면 재작성

### 📌 오늘의 목표
기존 `docs/06_플로우차트.md`를 TeamPro 프로젝트의 `signup-flow-analysis.html` 스타일로 전면 재작성

### ✅ 완료 항목

#### 플로우차트 문서 재작성
- **기존 문제점**: 단순 박스 나열, 분기(다이아몬드) 노드 부족, 스타일 라인 과다, 섹션 분리 없음
- **TeamPro 스타일 분석**: `docs/signup-flow-analysis.html`의 Mermaid 패턴, 색상 체계, 구조 분석 완료
- **전면 재작성 (300줄 → 444줄)**:
  - 범례 테이블 추가 (7가지 색상 의미 정의)
  - 섹션 1: 전체 서비스 통합 플로우 (직접 접속 + 파트너 SSO 두 진입 경로)
  - 섹션 2: 계약서 작성 상세 플로우 (마법사 8단계 + 법적 검증 분기)
  - 섹션 3: 전자서명 프로세스 (동의/거부 분기)
  - 섹션 4: 파트너 연동 상세 플로우 (HMAC 검증 → SSO → 콜백/취소 분기)
  - 섹션 5: Phase 2 RBAC 권한 분기 (역할별 메뉴 subgraph + 회원 계층)
  - 섹션 6: 계약서 상태 전이도 (stateDiagram-v2, 중첩 상태 + 노트)
  - Phase별 기능 비교표 (MVP vs Phase 1 vs Phase 2)
  - 주요 사용자 시나리오 3가지 (직접 가입, 파트너 연동, 강사 서명)
  - 화면 간 이동 경로 요약 테이블 유지

#### 개선 포인트
- 다이아몬드 분기 노드 (`{조건?}`) 적극 활용 → 의사결정 지점 명확화
- subgraph로 논리적 그룹핑 (서비스 진입, 마법사, 관리자 메뉴 등)
- `<br/><i>설명</i>` HTML 레이블로 노드 내 부가정보 표시
- 색상 체계 일관성: 인디고(핵심), 에메랄드(완료), 앰버(알림), 레드(에러), 블루(서비스), 퍼플(관리자)
- 점선(`-.->`)으로 비동기/선택적 프로세스 구분
- stroke-width 2px(강조) vs 1px(일반) 구분

### 💡 메모
- MermaidBlock.tsx 컴포넌트가 `htmlLabels: true` 설정 → `<br/>`, `<i>` 태그 렌더링 지원 확인
- 각 다이어그램이 독립적으로 렌더링되므로 섹션별 분리가 자연스러움
- stateDiagram-v2의 중첩 상태(nested state)와 note 문법 활용

---

## 2026-03-04 (화) — 인사서류 카테고리 구성안 반영 (문서 업데이트)

### 📌 오늘의 목표
`학온_인사서류_카테고리_v1.docx` (2026-02-25, 주식회사 학온) 내용을 기존 개발문서 5종에 반영

### ✅ 완료 항목

#### 문서 업데이트 (5종)
- **01_계획서.md**
  - 프로젝트 유형 "전자계약 플랫폼" → "전자계약 · 인사서류 플랫폼" 확장
  - 사이트맵에 인사서류 관리 (/documents/*) 라우트 추가
  - URL 설계 테이블에 인사서류 경로 3건 추가
  - §3.6 인사서류 관리 기능 신규 섹션 추가 (5개 서랍 × 26종+ 전체 명세)
  - 역할별 권한 테이블에 "인사서류 작성" 칼럼 추가
  - Phase 3 일정 상세화 (2주 → 4주, 서랍별 구현 일정 명시)
  - §8.4 인사서류 데이터 관리 정책 추가
  - 버전 v1.0 → v1.1
- **02_화면구조도.md**
  - Phase 3 인사서류 관리 섹션 신규 추가
  - 라우트 4건 (/documents, /documents/create/[type], /documents/view/[id], /documents/sign/[id])
  - 서랍(카테고리) 구성 테이블 추가
- **03_데이터맵.md**
  - "고도화 시 추가 예정" 섹션을 Phase 2/3으로 분리
  - Phase 3 인사서류 화면별 데이터 소스 테이블 추가
  - 서류 카테고리 데이터 (5개 서랍) 상세 테이블 추가
- **04_DB설계.md**
  - Phase 3 테이블 3개 신규 설계: document_categories, document_templates, hr_documents
  - field_schema JSONB 예시 포함
  - RLS/인덱스 정책 명시
  - 테이블 관계도 추가
- **05_체크리스트.md**
  - Phase 3 섹션 전면 재구성
  - "인사서류 확장 (사실확인서, 경위서, 사직서)" 1줄 → 5개 서랍별 26종 개별 체크항목으로 확장
  - 기반 설계 (DB, UI 프레임워크, PDF, 서명) 체크항목 추가

### 📝 참조 문서
- `docs/학온_인사서류_카테고리_v1.docx` (원본)
- 카테고리: 채용및계약(8), 근태복무(6), 퇴직종료(6), 증명서약(5), 법무컨설팅(1)

---

## 2026-02-08 (토) — Sprint 2 완료 + SSO 자동 로그인 구현

### 📌 오늘의 목표
파트너 API Sprint 2 (Webhook + 콜백) 구현 및 SSO 자동 로그인 방식으로 아키텍처 전환

### 🔄 중요 설계 변경
파트너 연동 방식을 "계약서 마법사 직행"에서 **"SSO 자동 로그인 + 대시보드 진입"**으로 변경.

**변경 이유:**
- 학온은 계약서 생성뿐만 아니라 계약 관리(D-Day 알람, 급여/직책별 필터, 인사서류 등)가 핵심
- 파트너 경유 학원도 학온의 모든 기능을 사용해야 하므로, 대시보드가 진입점이 되어야 함
- 파트너사 학원관리 프로그램에서 "학온 계약서 작성" 버튼 → 학온 대시보드 → 모든 기능 사용
- 개별 학원 직접 구독과 파트너 경유 학원 모두 동일한 사용자 경험 제공

**학온 고객 2채널:**
1. 학원운영관리프로그램 회사 (API 연동) → SSO 자동 로그인으로 대시보드 진입
2. 개별 학원 (직접 구독) → 직접 로그인으로 대시보드 진입

### ✅ 완료 항목

#### Sprint 2 Step 1 — Webhook + 콜백 API
- **새 파일 2개 추가**
  1. `src/lib/partner/webhook.ts` — Webhook 발송 유틸 (HMAC 서명 포함)
  2. `src/app/api/partner/callback/route.ts` — 계약 완료 콜백 API
- Webhook 발송: HMAC-SHA256 서명 + X-Hagon-Signature 헤더
- 콜백 API: 세션 완료 처리 → partner_contracts 저장 → Webhook 발송 → 성공/실패 기록
- Git 커밋: `feat: Webhook 발송 유틸 + 계약 완료 콜백 API 구현`

#### Sprint 2 Step 2 — SSO 자동 로그인 시스템
- **새 파일 2개 추가**
  1. `src/lib/supabase-admin.ts` — 서버 전용 Admin 클라이언트 (service_role key)
  2. `src/app/api/partner/sso/route.ts` — SSO API
- SSO API 동작:
  - HMAC 서명 검증
  - 학원 이메일로 Supabase 계정 확인/자동 생성
  - academy_info 테이블에 학원정보 자동 등록
  - Supabase Admin의 generateLink()로 매직 링크 토큰 생성
  - 토큰을 partner_sessions의 metadata._magic_link에 저장
- Vercel + .env.local에 SUPABASE_SERVICE_ROLE_KEY 환경변수 설정
- Git 커밋: `feat: SSO 자동 로그인 구현 - supabase-admin, SSO API, 런칭 페이지 매직링크 연동`

#### Sprint 2 Step 3 — 런칭 페이지 SSO 대응
- `src/app/partner/launch/page.tsx` 수정
  - 매직 링크 토큰으로 supabase.auth.verifyOtp() 자동 로그인
  - 성공 시 /dashboard로 이동
  - 실패 시 로그인 페이지 이동 버튼 표시
  - 하위 호환: 매직 링크 없는 세션은 기존 마법사 방식으로 동작
  - 로딩 메시지 상태별 변경 (준비 중 → 자동 로그인 중 → 대시보드 이동)

#### Sprint 2 Step 4 — Complete 페이지 파트너 연동
- `src/app/wizard/type-a/complete/page.tsx` 수정
  - 계약 저장 성공 후 sessionStorage에서 파트너 세션 확인
  - /api/partner/callback 호출 → Webhook 발송
  - 파트너 경유 시 "파트너 프로그램으로 돌아가기" 버튼 표시
  - 파트너 콜백 실패해도 기존 플로우에 영향 없음 (try-catch 격리)
  - 일반 사용자는 기존과 100% 동일한 화면
- Git 커밋: `feat: complete 페이지에 파트너 콜백 연동 - Webhook 발송 + 복귀 버튼`

### 📁 현재 프로젝트 구조 (파트너 API 관련)
```
src/
├── app/
│   ├── api/partner/
│   │   ├── session/route.ts    ✅ 세션 생성 API
│   │   ├── verify/route.ts     ✅ 토큰 검증 API
│   │   ├── sso/route.ts        ✅ SSO 자동 로그인 API (NEW)
│   │   └── callback/route.ts   ✅ 계약 완료 콜백 API (NEW)
│   └── partner/
│       └── launch/page.tsx     ✅ 런칭 페이지 (SSO 대응 수정)
├── lib/
│   ├── partner/
│   │   ├── auth.ts             ✅ HMAC 인증
│   │   ├── session.ts          ✅ 세션 관리
│   │   └── webhook.ts          ✅ Webhook 발송 (NEW)
│   ├── supabase.ts             (기존 - 변경 없음)
│   └── supabase-admin.ts       ✅ Admin 클라이언트 (NEW)
├── types/
│   └── partner.ts              ✅ 타입 정의
└── app/wizard/type-a/
    └── complete/page.tsx        ✅ 파트너 콜백 연동 (수정)
```

### 🔜 다음 작업 (Sprint 3)
- [ ] 취소 처리 로직 (사용자가 마법사 중간에 이탈 시)
- [ ] Webhook 재시도 로직 (5회, 점진적 대기)
- [ ] 파트너 연동 가이드 문서 업데이트 (SSO 방식 반영)
- [ ] CORS를 파트너사 도메인만 허용으로 변경
- [ ] 도메인 승인 후 Vercel 연결
- [ ] 파트너 관리 어드민 페이지 (키 발급, 통계)
- [ ] API 스펙 문서 SSO 방식으로 업데이트

### 💡 메모
- 파트너 버튼 이름 확정: "학온 계약서 작성"
- 로그인 필수 정책 확정: 파트너 경유도 학온 계정 필요 (계약 관리, D-Day 알람 등 모든 기능 사용 위해)
- SSO는 Supabase Admin generateLink + verifyOtp 방식 채택
- service_role key는 서버 사이드에서만 사용, NEXT_PUBLIC_ 접두사 없음
- wizard-store의 persist 미들웨어 (localStorage) 덕분에 페이지 이동 시에도 데이터 유지 확인
- complete 페이지의 파트너 콜백은 실패해도 계약 저장 플로우에 영향 없도록 격리
- 기존 빌드 경고(useEffect, img, CSR deopt)는 기능 무관, 추후 정리

---

## 2026-02-07 (금) — 파트너 API 설계 및 Sprint 1 구현

### 📌 오늘의 목표
파트너사(학원관리 프로그램)와 학온 시스템을 API로 연동하기 위한 설계 및 기반 구현

### ✅ 완료 항목

#### Phase 1 — 아키텍처 설계
- 파트너 API 전체 아키텍처 설계서 작성 완료
- 보안 3중 구조 확정: HMAC 서명 + 세션 토큰 + Signed URL
- 연동 플로우 확정: 세션 생성 → 런칭 → 마법사 진행 → Webhook + 리다이렉트
- 파트너 플랜 구조 설계: FREE(3개월) → BASIC → PRO
- 향후 서류 확장(사실확인서, 경위서, 사직서) 대응 가능한 service_type 설계

#### Phase 2 — API 스펙 문서
- OpenAPI 형태의 파트너 API 스펙 문서 작성 완료
- 세션 생성, 토큰 검증, Webhook 콜백, 리다이렉트 전체 규격 정의
- JavaScript/Python 언어별 코드 예시 포함
- Webhook 재시도 정책 정의 (5회, 점진적 대기)
- Sandbox 테스트 환경 규격 정의
- metadata 필드 설계 (파트너사 내부 데이터 투과 전달)

#### Phase 3 — Sprint 1 구현 (완료)
- **Supabase 테이블 3개 생성**
  - `partners` — 파트너사 관리 (플랜, 쿼터, 인증키)
  - `partner_sessions` — 세션 토큰 관리 (10분 만료, 일회성)
  - `partner_contracts` — 파트너 경유 계약 추적 (Webhook 상태)
  - 인덱스, 트리거, RLS 정책 포함

- **새 파일 6개 추가** (기존 코드 수정 없음)
  1. `src/types/partner.ts` — 파트너 타입 및 에러 코드 정의
  2. `src/lib/partner/auth.ts` — HMAC-SHA256 서명 검증 (timingSafeEqual 적용)
  3. `src/lib/partner/session.ts` — 세션 CRUD (생성/검증/사용마킹/완료/취소)
  4. `src/app/api/partner/session/route.ts` — 세션 생성 API (POST, CORS 포함)
  5. `src/app/api/partner/verify/route.ts` — 토큰 검증 API
  6. `src/app/partner/launch/page.tsx` — 파트너 런칭 페이지 (wizard-store 바인딩)

- **Git 커밋 2건**
  - `feat: 파트너 API 기반 구축 - 타입 정의, HMAC 인증, 세션 관리, 세션 생성 API`
  - `feat: 파트너 런칭 페이지 + 토큰 검증 API 구현`

#### 도메인
- 가비아에서 도메인 신청 완료 (승인 대기 중)
- 네임서버: Vercel DNS (ns1.vercel-dns.com, ns2.vercel-dns.com) 설정

### 💡 메모
- CORS는 현재 `*`로 열어둠 → 운영 시 파트너사 도메인만 허용으로 변경 필요
- 기존 빌드 경고(useEffect 의존성, img 태그 등)는 파트너 API와 무관, 추후 일괄 정리
- complete/page.tsx와 preview/page.tsx 코드 구조 확인 완료 → Sprint 2에서 연결 예정

---
