import { NextResponse } from 'next/server';

import { cancelSession } from '@/lib/partner/session';
import { sendPartnerWebhookWithRetry } from '@/lib/partner/webhook';
import { supabase } from '@/lib/supabase';

type CancelRequestBody = {
  session_token?: string;
  reason?: string;
};

const errorResponse = (code: string, message: string, status: number) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CancelRequestBody;
    const sessionToken = body.session_token?.trim();

    if (!sessionToken) {
      return errorResponse('MISSING_REQUIRED_FIELD', '필수 값이 누락되었습니다.', 400);
    }

    const { data: session, error: sessionError } = await supabase
      .from('partner_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      return errorResponse('SESSION_NOT_FOUND', '세션을 찾을 수 없습니다.', 404);
    }

    if (session.status === 'COMPLETED') {
      return errorResponse(
        'ALREADY_COMPLETED',
        '이미 완료된 세션은 취소할 수 없습니다.',
        409
      );
    }

    if (session.status === 'CANCELED') {
      return errorResponse('ALREADY_CANCELED', '이미 취소된 세션입니다.', 409);
    }

    const cancellation = await cancelSession(sessionToken);
    if (!cancellation.session) {
      return errorResponse('INTERNAL_ERROR', '세션 취소 처리에 실패했습니다.', 500);
    }

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('partner_secret, webhook_url')
      .eq('partner_id', session.partner_id)
      .single();

    if (partnerError || !partner) {
      return errorResponse('INTERNAL_ERROR', '파트너 정보를 찾을 수 없습니다.', 500);
    }

    const webhookUrl = session.webhook_url || partner.webhook_url || null;

    if (webhookUrl) {
      const webhookPayload = {
        session_token: sessionToken,
        status: 'CANCELED',
        reason: body.reason ?? null,
        metadata: session.metadata ?? null,
      };

      await sendPartnerWebhookWithRetry(
        webhookUrl,
        partner.partner_secret,
        'contract.canceled',
        webhookPayload
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        return_url: session.return_url,
        status: 'CANCELED',
      },
    });
  } catch (error: any) {
    return errorResponse(
      'INTERNAL_ERROR',
      error?.message || '알 수 없는 오류가 발생했습니다.',
      500
    );
  }
}
