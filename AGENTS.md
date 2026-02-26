# Agent Rules

## 1. 기본 원칙
- **언어**: 모든 소통, 주석, 커밋 메시지는 **한국어**
- **기존 코드 패턴 존중**

## 2. 프로젝트 환경
- Next.js 14 + TypeScript + Tailwind CSS + Supabase + Zustand + lucide-react
- **라우팅**: Next.js App Router (파일 기반 라우팅)
- **상태 관리**: Zustand (wizard-store.ts — persist 미들웨어 사용)

## 3. 브라우저 사용 금지
- 코드를 읽으면 파악 가능한 내용은 **브라우저(Playwright) 확인 금지**
- 브라우저는 **시각적 결과물을 반드시 눈으로 확인해야 하는 경우에만** 사용

## 4. 명령어
- `npm run dev` / `npm run build` / `npm run start` / `npm run lint`
- **테스트 프레임워크 없음** - 테스트 코드 작성/실행 금지

## 5. 코드 스타일
- **네이밍**: 컴포넌트/타입 PascalCase, 변수/함수 camelCase
- **들여쓰기**: 기존 파일 스타일 유지, 새 파일은 2칸
- **TypeScript**: `any` 사용 금지, 공통 타입은 `src/types/`에 정의

## 6. Git 워크플로우
- **자동 커밋**: 코드 변경 완료 시 자동 커밋 (별도 확인 없음)
- **HAGON_DEV_LOG.md**: 주요 작업 내용 기록

## 7. UI 규칙
- **다크모드**: 모든 색상에 `dark:` variant 추가
- **모달 z-index**: 일반 `z-50`, 중첩 `z-[9999]`
- **스크롤바 튐 방지**: `overflow-y: scroll` 사용 (auto 대신)
- **네이티브 폼 금지**: `<select>`, `<input type="date">` 사용 금지
- **모달 애니메이션 (화면 튐 방지)**:
  - 조건부 렌더링 금지: `{isOpen && <Modal />}` 패턴 금지
  - 모달은 항상 렌더링하고, `isOpen` prop으로 `opacity` + `pointer-events`만 토글
  - `scale` 애니메이션 금지
  - `backdrop-blur` 금지

## 8. 디자인 가이드
- **금지**: 날카로운 모서리(`rounded-none`), 단색 플랫 버튼, `border-2` 이상, 애니메이션 없는 상태 전환

## 9. 서브에이전트 위임 규칙
- `task()` 호출 시 `category`와 `subagent_type`은 **상호 배타적** — 절대 동시 사용 금지
- 위임 후 반드시 파일 생성/변경 여부를 **직접 확인**

## 10. 역할 정의
- **학원 전자계약 플랫폼 개발자**: 학온(HAGON) 시스템의 기능 고도화 및 확장을 담당한다.
- **파트너 API 연동 전문가**: 학원관리 프로그램(TeamPro 등)과의 API 연동, SSO, Webhook 등 외부 연동 아키텍처를 설계·구현한다.

## 11. 작업 맥락
- **새 세션 시작 시** `docs/context.md`를 반드시 읽고 이전 작업 맥락을 파악한 뒤 진행한다.
- 중요한 결정, 구조 변경, 진행 상황은 `docs/context.md`에 수시로 기록한다.
