import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { verifyPartnerSignature } from '@/lib/partner/auth';
import { getPartnerCorsHeaders } from '@/lib/partner/cors';
import { createPartnerSession } from '@/lib/partner/session';
import {
  PartnerErrorCode,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type PartnerErrorResponse,
} from '@/types/partner';

const isValidBizNumber = (bizNumber: string) => {
  if (!/^[0-9-]+$/.test(bizNumber)) return false;
  const digitsOnly = bizNumber.replace(/-/g, '');
  return /^\d{10}$/.test(digitsOnly);
};

export async function OPTIONS(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const headers = await getPartnerCorsHeaders(origin);
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const partnerId = request.headers.get('x-partner-id') ?? '';
  const timestamp = request.headers.get('x-timestamp') ?? '';
  const signature = request.headers.get('x-signature') ?? '';
  const corsHeaders = await getPartnerCorsHeaders(origin, partnerId);

  const errorResponse = (
    code: PartnerErrorCode,
    message: string,
    status: number
  ): NextResponse<PartnerErrorResponse> =>
    NextResponse.json(
      { success: false, error: { code, message } },
      { status, headers: corsHeaders }
    );

  const successResponse = (
    data: CreateSessionResponse['data']
  ): NextResponse<CreateSessionResponse> =>
    NextResponse.json({ success: true, data }, { status: 200, headers: corsHeaders });

  if (!partnerId || !timestamp || !signature) {
    return errorResponse(
      PartnerErrorCode.INVALID_SIGNATURE,
      'Missing authentication headers.',
      401
    );
  }

  let body: CreateSessionRequest;
  try {
    body = (await request.json()) as CreateSessionRequest;
  } catch {
    return errorResponse(
      PartnerErrorCode.MISSING_REQUIRED_FIELD,
      'Invalid request body.',
      400
    );
  }

  const signatureResult = await verifyPartnerSignature({
    partnerId,
    timestamp,
    body: body as Record<string, any>,
    signature,
  });

  if (!signatureResult.valid || !signatureResult.partner) {
    const errorCode =
      signatureResult.error === 'EXPIRED_TIMESTAMP'
        ? PartnerErrorCode.EXPIRED_TIMESTAMP
        : PartnerErrorCode.INVALID_SIGNATURE;

    return errorResponse(errorCode, 'Signature verification failed.', 401);
  }

  if (!body.academy_name || !body.biz_number || !body.rep_name || !body.return_url) {
    return errorResponse(
      PartnerErrorCode.MISSING_REQUIRED_FIELD,
      'Required fields are missing.',
      400
    );
  }

  if (!isValidBizNumber(body.biz_number)) {
    return errorResponse(
      PartnerErrorCode.INVALID_BIZ_NUMBER,
      'Invalid business number format.',
      400
    );
  }

  if (body.service_type && body.service_type !== 'CONTRACT') {
    return errorResponse(
      PartnerErrorCode.INVALID_SERVICE_TYPE,
      'Unsupported service type.',
      400
    );
  }

  const { partner } = signatureResult;
  if (partner.monthly_usage == null || partner.monthly_quota == null) {
    return errorResponse(
      PartnerErrorCode.INTERNAL_ERROR,
      'Partner quota configuration missing.',
      500
    );
  }

  if (partner.monthly_usage >= partner.monthly_quota) {
    return errorResponse(
      PartnerErrorCode.QUOTA_EXCEEDED,
      'Monthly quota exceeded.',
      429
    );
  }

  const { error: usageError } = await supabase
    .from('partners')
    .update({ monthly_usage: partner.monthly_usage + 1 })
    .eq('id', partner.id);

  if (usageError) {
    return errorResponse(
      PartnerErrorCode.INTERNAL_ERROR,
      'Failed to update partner usage.',
      500
    );
  }

  const sessionResult = await createPartnerSession(partner.partner_id, body);
  if (!sessionResult.session || !sessionResult.launch_url) {
    return errorResponse(
      PartnerErrorCode.INTERNAL_ERROR,
      'Failed to create partner session.',
      500
    );
  }

  return successResponse({
    session_token: sessionResult.session.session_token,
    launch_url: sessionResult.launch_url,
    expires_at: sessionResult.session.expires_at,
  });
}
