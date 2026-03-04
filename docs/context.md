# 학온(HAGON) 작업 맥락

## 프로젝트 개요
- **학온(HAGON)**: 학원 전자계약 플랫폼
- 지인이 MVP까지 개발한 프로젝트를 인수받아 기능 고도화 작업 진행
- 기술 스택: Next.js 14 + TypeScript + Tailwind CSS + Supabase + Zustand + lucide-react
- 배포: Vercel (도메인 승인 대기 중)

## 개발 환경
- macOS (Mac mini), 사용자: psebooks
- 프로젝트 경로: `~/dev/hagon26`
- 관련 프로젝트: `~/dev/TeamPro`, `~/dev/SC`, `~/dev/XamTown`, `~/dev/Bank4`

---

## 핵심 기능 (MVP 기준)

### 1. 계약서 마법사 (Wizard)
- `src/app/wizard/type-a/` — **5단계 구조로 개선 진행 중** (기존 10페이지 → 5단계)
- Zustand persist로 페이지 이동 시 데이터 유지
- 상세: `docs/07_마법사_개선안.md` 참조

### 2. 파트너 API 연동
- 학원관리 프로그램과의 API 연동 (SSO, Webhook)
- HMAC-SHA256 서명 검증, 세션 토큰 관리
- Supabase 테이블: partners, partner_sessions, partner_contracts

### 3. 고객 2채널
- 파트너 경유 (학원관리 프로그램 → SSO 자동 로그인 → 대시보드)
- 개별 학원 (직접 구독 → 로그인 → 대시보드)

## 프로젝트 구조
```
src/
├── app/
│   ├── api/partner/     — 파트너 API (session, verify, sso, callback, cancel)
│   ├── api/signature/   — 서명 API
│   ├── api/pdf/         — PDF 생성 API
│   ├── wizard/type-a/   — 계약서 마법사 (5단계 개선 중, 기존 10페이지)
│   ├── partner/launch/  — 파트너 런칭 페이지
│   ├── dashboard/       — 대시보드
│   ├── sign/[id]/       — 전자 서명
│   ├── view/[id]/       — 계약서 조회
│   ├── login/           — 로그인
│   └── pilot/jr/        — 파일럿
├── components/
│   ├── contracts/       — 계약서 문서 컴포넌트
│   └── wizard/          — 마법사 UI 컴포넌트
├── constants/           — 법적 기준 상수
├── lib/                 — Supabase, 유틸리티, 검증, 계산
└── types/               — 타입 정의 (wizard, partner)
```

---

## 고도화 작업 현황

### 2026-03-04: 마법사 5단계 개선 착수
- **결정**: 현재 10페이지 마법사 → 5단계로 축소 (안 A 채택)
- **핵심 변경**:
  - 학원정보 → 설정/프로필 페이지로 분리 (계약마다 입력 → 1회 등록)
  - Step 3 (계약유형 확인) 삭제 (입력 없는 빈 화면)
  - Step 4 (기간) + Step 5 (근무) 합체 → '② 근무조건'
  - Step 8 + Preview + Complete 합체 → '⑤ 검토·완료' (탭 전환)
- **문서**: `docs/07_마법사_개선안.md` (상세 분석 + 변경 매핑표)

### 2026-03-03: 화면 변경이력 탭 구현
- devdocs에 화면 변경이력 탭 추가 (ChangelogView.tsx)
- before/after 비교, 이미지 라이트박스, 화면 선택 탭 네비게이션
- 커밋: 2f5f8b6 → 118f033 → f946b98

### 2026-02-26: 프로젝트 인수 및 작업 시작
- 지인이 개발한 MVP 프로젝트를 인수받아 고도화 작업 착수
- AGENTS.md 생성 (TeamPro 기반 커스터마이징)
- docs/context.md 생성 (작업 맥락 기록 시작)

---

## 주요 아키텍처 결정
1. **Next.js App Router**: 파일 기반 라우팅
2. **Zustand + persist**: 마법사 상태 관리 (localStorage)
3. **Supabase**: 인증 + DB + RLS
4. **파트너 연동**: HMAC 서명 + 세션 토큰 + SSO (매직 링크)
5. **PDF 생성**: html2canvas + jspdf

---

## 미완료 항목 (HAGON_DEV_LOG.md Sprint 3 기준)
- [ ] 취소 처리 로직 (마법사 중간 이탈 시)
- [ ] Webhook 재시도 로직 (5회, 점진적 대기)
- [ ] 파트너 연동 가이드 문서 업데이트 (SSO 방식 반영)
- [ ] CORS를 파트너사 도메인만 허용으로 변경
- [ ] 도메인 승인 후 Vercel 연결
- [ ] 파트너 관리 어드민 페이지 (키 발급, 통계)
- [ ] API 스펙 문서 SSO 방식으로 업데이트
