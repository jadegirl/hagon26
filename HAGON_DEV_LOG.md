# 학온(HAGON) 개발일지

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
