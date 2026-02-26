import { NextResponse } from 'next/server';

import { markSessionUsed, verifySessionToken } from '@/lib/partner/session';
type VerifyRequestBody = {
  token?: string;
};

const errorResponse = (code: string, message: string, status: number) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });

export async function POST(request: Request): Promise<NextResponse> {
  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return errorResponse('MISSING_REQUIRED_FIELD', 'Invalid request body.', 400);
  }

  const token = body.token?.trim();
  if (!token) {
    return errorResponse('MISSING_REQUIRED_FIELD', 'Token is required.', 400);
  }

  const verification = await verifySessionToken(token);
  if (!verification.session) {
    const errorCode =
      verification.error === 'SESSION_EXPIRED'
        ? 'SESSION_EXPIRED'
        : verification.error === 'SESSION_ALREADY_USED'
          ? 'SESSION_ALREADY_USED'
          : 'INVALID_SESSION';
    return errorResponse(
      errorCode,
      errorCode === 'SESSION_ALREADY_USED'
        ? '이미 사용된 세션입니다.'
        : errorCode === 'SESSION_EXPIRED'
          ? '세션이 만료되었습니다.'
          : '잘못된 접근입니다.',
      400
    );
  }

  const marked = await markSessionUsed(token);
  if (!marked.session) {
    return errorResponse('INTERNAL_ERROR', 'Failed to mark session.', 500);
  }

  return NextResponse.json({ success: true, data: { session: marked.session } });
}
