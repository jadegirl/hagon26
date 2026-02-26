# 학온(HAGON) 파트너 API 연동 가이드

## 개요
학온 파트너 API를 통해 학원관리 프로그램에서 학온의 계약서 생성/관리 기능을 연동할 수 있습니다.

## 인증 방식
- HMAC-SHA256 서명 기반 인증
- 요청 시 3개 헤더 필수: `X-Partner-Id`, `X-Timestamp`, `X-Signature`
- 서명 생성: HMAC-SHA256(partner_secret, partner_id + timestamp + JSON.stringify(body))

## API 엔드포인트

### 1. 세션 생성
`POST /api/partner/session`

파트너사에서 학원 정보를 전달하고 학온 진입 URL을 받습니다.

**Headers:**
| 헤더 | 설명 |
|------|------|
| X-Partner-Id | 파트너 ID |
| X-Timestamp | ISO 8601 형식 (5분 이내) |
| X-Signature | HMAC-SHA256 서명 |

**Request Body:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| academy_name | string | ✅ | 학원명 |
| biz_number | string | ✅ | 사업자등록번호 (10자리) |
| rep_name | string | ✅ | 대표자명 |
| return_url | string | ✅ | 완료 후 복귀 URL |
| academy_address | string | - | 학원 주소 |
| academy_phone | string | - | 학원 연락처 |
| webhook_url | string | - | Webhook 수신 URL (미지정 시 파트너 기본 URL 사용) |
| service_type | string | - | 서비스 유형 (현재 'CONTRACT'만 지원) |
| metadata | object | - | 파트너 내부 데이터 (그대로 Webhook에 반환) |

**Response (성공):**
```json
{
  "success": true,
  "data": {
    "session_token": "uuid",
    "launch_url": "https://hagon.co.kr/partner/launch?token=uuid",
    "expires_at": "2026-02-09T12:10:00.000Z"
  }
}
```

### 2. 토큰 검증
`POST /api/partner/verify`

세션 토큰의 유효성을 확인합니다.

**Request Body:**
| 필드 | 타입 | 필수 |
|------|------|------|
| session_token | string | ✅ |

### 3. Webhook 수신

학온에서 계약 완료/취소 시 파트너사 Webhook URL로 이벤트를 전송합니다.

**이벤트 종류:**
| 이벤트 | 설명 |
|--------|------|
| contract.completed | 계약서 작성 완료 |
| contract.canceled | 계약 취소 |

**Webhook Headers:**
| 헤더 | 설명 |
|------|------|
| X-Hagon-Signature | HMAC-SHA256 서명 (body 전체) |
| X-Hagon-Event | 이벤트 종류 |

**Webhook Body (contract.completed):**
```json
{
  "event": "contract.completed",
  "timestamp": "2026-02-09T12:00:00.000Z",
  "data": {
    "session_token": "uuid",
    "contract_id": "uuid",
    "status": "COMPLETED",
    "instructor_name": "김민수",
    "contract_period": {
      "start_date": "2026-03-01",
      "end_date": "2027-02-28"
    },
    "metadata": {}
  }
}
```

**Webhook Body (contract.canceled):**
```json
{
  "event": "contract.canceled",
  "timestamp": "2026-02-09T12:00:00.000Z",
  "data": {
    "session_token": "uuid",
    "status": "CANCELED",
    "reason": "사용자 취소",
    "metadata": {}
  }
}
```

**재시도 정책:**
- 최대 5회 시도
- Exponential backoff: 1초 → 2초 → 4초 → 8초 → 16초
- HTTP 200 응답 시 성공으로 처리

### 4. CORS 정책
- 파트너사 웹 프론트엔드에서 직접 호출 시 도메인 등록 필요
- 서버 간 통신(백엔드→학온 API)은 CORS 제한 없음
- 도메인 등록 요청: 학온 담당자에게 연락

## 연동 플로우

## 에러 코드
| 코드 | 설명 |
|------|------|
| INVALID_SIGNATURE | 서명 검증 실패 |
| EXPIRED_TIMESTAMP | 타임스탬프 만료 (5분 초과) |
| MISSING_REQUIRED_FIELD | 필수 필드 누락 |
| INVALID_BIZ_NUMBER | 사업자등록번호 형식 오류 |
| INVALID_SERVICE_TYPE | 지원하지 않는 서비스 유형 |
| QUOTA_EXCEEDED | 월간 사용량 초과 |
| SESSION_NOT_FOUND | 세션 없음 |
| ALREADY_COMPLETED | 이미 완료된 세션 |
| ALREADY_CANCELED | 이미 취소된 세션 |
| INTERNAL_ERROR | 서버 내부 오류 |

## 연동 코드 예시 (JavaScript)
```javascript
const crypto = require('crypto');

const PARTNER_ID = 'your-partner-id';
const PARTNER_SECRET = 'your-partner-secret';
const HAGON_API = 'https://hagon.co.kr/api/partner';

async function createSession(academyData) {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify(academyData);
  const signature = crypto
    .createHmac('sha256', PARTNER_SECRET)
    .update(PARTNER_ID + timestamp + body)
    .digest('hex');

  const response = await fetch(`${HAGON_API}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Partner-Id': PARTNER_ID,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    },
    body,
  });

  return response.json();
}

// 사용 예시
const result = await createSession({
  academy_name: '잠룡승천학원',
  biz_number: '123-45-67890',
  rep_name: '홍길동',
  return_url: 'https://your-app.com/callback',
});

// result.data.launch_url로 사용자 이동
window.location.href = result.data.launch_url;
```

## 연동 코드 예시 (Python)
```python
import hmac, hashlib, json, requests
from datetime import datetime

PARTNER_ID = 'your-partner-id'
PARTNER_SECRET = 'your-partner-secret'
HAGON_API = 'https://hagon.co.kr/api/partner'

def create_session(academy_data):
    timestamp = datetime.utcnow().isoformat() + 'Z'
    body = json.dumps(academy_data, ensure_ascii=False)
    signature = hmac.new(
        PARTNER_SECRET.encode(),
        (PARTNER_ID + timestamp + body).encode(),
        hashlib.sha256
    ).hexdigest()

    response = requests.post(
        f'{HAGON_API}/session',
        headers={
            'Content-Type': 'application/json',
            'X-Partner-Id': PARTNER_ID,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
        },
        data=body,
    )
    return response.json()
```

## 문의
- 기술 문의: 학온 기술팀
- 파트너 등록/도메인 추가: 학온 사업팀

---
문서 버전: 1.0 | 최종 업데이트: 2026-02-09
