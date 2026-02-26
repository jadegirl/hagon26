import { NextResponse } from 'next/server';

import { completeSession } from '@/lib/partner/session';
import { sendPartnerWebhookWithRetry } from '@/lib/partner/webhook';
import { supabase } from '@/lib/supabase';

type CallbackRequestBody = {
  session_token?: string;
  contract_id?: string;
  instructor_name?: string;
  contract_start_date?: string;
  contract_end_date?: string;
};

const errorResponse = (code: string, message: string, status: number) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CallbackRequestBody;
    const sessionToken = body.session_token?.trim();
    const contractId = body.contract_id?.trim();

    if (!sessionToken || !contractId) {
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
      return errorResponse('ALREADY_COMPLETED', '이미 완료된 세션입니다.', 409);
    }

    const completion = await completeSession(sessionToken, contractId);
    if (!completion.session) {
      return errorResponse('INTERNAL_ERROR', '세션 완료 처리에 실패했습니다.', 500);
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

    const { data: partnerContract, error: contractError } = await supabase
      .from('partner_contracts')
      .insert({
        partner_id: session.partner_id,
        session_id: session.id,
        contract_id: contractId,
        service_type: session.service_type,
        instructor_name: body.instructor_name ?? null,
        contract_start_date: body.contract_start_date ?? null,
        contract_end_date: body.contract_end_date ?? null,
        metadata: session.metadata ?? null,
      })
      .select('*')
      .single();

    if (contractError || !partnerContract) {
      return errorResponse('INTERNAL_ERROR', '파트너 계약 저장에 실패했습니다.', 500);
    }

    if (webhookUrl) {
      const webhookPayload = {
        session_token: sessionToken,
        contract_id: contractId,
        status: 'COMPLETED',
        instructor_name: body.instructor_name,
        contract_period: {
          start_date: body.contract_start_date,
          end_date: body.contract_end_date,
        },
        metadata: session.metadata ?? null,
      };

      const webhookResult = await sendPartnerWebhookWithRetry(
        webhookUrl,
        partner.partner_secret,
        'contract.completed',
        webhookPayload
      );

      if (webhookResult.success) {
        await supabase
          .from('partner_contracts')
          .update({
            webhook_sent: true,
            webhook_sent_at: new Date().toISOString(),
          })
          .eq('id', partnerContract.id);
      } else {
        await supabase
          .from('partner_contracts')
          .update({
            webhook_sent: false,
            webhook_last_error: `${webhookResult.error || 'Webhook failed'} (attempts: ${webhookResult.attempts})`,
          })
          .eq('id', partnerContract.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        return_url: session.return_url,
        contract_id: contractId,
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
