import { NextResponse } from 'next/server';
import crypto from 'crypto';

import { verifyPartnerSignature } from '@/lib/partner/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';
import { PartnerErrorCode, type PartnerErrorResponse } from '@/types/partner';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Partner-Id, X-Timestamp, X-Signature',
};

const errorResponse = (
  code: PartnerErrorCode,
  message: string,
  status: number
): NextResponse<PartnerErrorResponse> =>
  NextResponse.json(
    { success: false, error: { code, message } },
    { status, headers: corsHeaders }
  );

const isValidBizNumber = (bizNumber: string) => {
  if (!/^[0-9-]+$/.test(bizNumber)) return false;
  const digitsOnly = bizNumber.replace(/-/g, '');
  return /^\d{10}$/.test(digitsOnly);
};

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const partnerId = request.headers.get('x-partner-id') ?? '';
    const timestamp = request.headers.get('x-timestamp') ?? '';
    const signature = request.headers.get('x-signature') ?? '';

    if (!partnerId || !timestamp || !signature) {
      return errorResponse(
        PartnerErrorCode.INVALID_SIGNATURE,
        'Missing authentication headers.',
        401
      );
    }

    const body = (await request.json()) as Record<string, any>;
    const {
      academy_email,
      academy_name,
      biz_number,
      rep_name,
      academy_address,
      academy_phone,
      return_url,
      webhook_url,
      metadata,
    } = body;

    const signatureResult = await verifyPartnerSignature({
      partnerId,
      timestamp,
      body,
      signature,
    });

    if (!signatureResult.valid || !signatureResult.partner) {
      const errorCode =
        signatureResult.error === 'EXPIRED_TIMESTAMP'
          ? PartnerErrorCode.EXPIRED_TIMESTAMP
          : PartnerErrorCode.INVALID_SIGNATURE;

      return errorResponse(errorCode, 'Signature verification failed.', 401);
    }

    if (!academy_email || !academy_name || !biz_number || !rep_name || !return_url) {
      return errorResponse(
        PartnerErrorCode.MISSING_REQUIRED_FIELD,
        'Required fields are missing.',
        400
      );
    }

    if (!isValidBizNumber(biz_number)) {
      return errorResponse(
        PartnerErrorCode.INVALID_BIZ_NUMBER,
        'Invalid business number format.',
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
      return errorResponse(PartnerErrorCode.QUOTA_EXCEEDED, 'Monthly quota exceeded.', 429);
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

    const { data: listResult, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return errorResponse(
        PartnerErrorCode.INTERNAL_ERROR,
        'Failed to fetch academy account.',
        500
      );
    }

    let user =
      listResult?.users?.find(
        (candidate) =>
          candidate.email?.toLowerCase() === String(academy_email).toLowerCase()
      ) ?? null;
    let isNewAccount = false;

    if (!user) {
      const tempPassword = `${crypto.randomUUID()}!Aa1`;
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: academy_email,
        password: tempPassword,
        email_confirm: true,
      });

      if (createError || !createdUser?.user) {
        return errorResponse(
          PartnerErrorCode.INTERNAL_ERROR,
          'Failed to create academy account.',
          500
        );
      }

      user = createdUser.user;
      isNewAccount = true;
    }

    const { data: academyInfo, error: academyInfoError } = await supabase
      .from('academy_info')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (academyInfoError && academyInfoError.code !== 'PGRST116') {
      return errorResponse(
        PartnerErrorCode.INTERNAL_ERROR,
        'Failed to load academy info.',
        500
      );
    }

    if (!academyInfo) {
      const { error: insertAcademyError } = await supabase
        .from('academy_info')
        .insert({
          user_id: user.id,
          academy_name,
          academy_address: academy_address ?? '',
          representative_name: rep_name,
          contact: academy_phone ?? '',
          business_number: biz_number,
        });

      if (insertAcademyError) {
        return errorResponse(
          PartnerErrorCode.INTERNAL_ERROR,
          'Failed to create academy info.',
          500
        );
      }
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/dashboard`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: academy_email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return errorResponse(
        PartnerErrorCode.INTERNAL_ERROR,
        'Failed to generate magic link.',
        500
      );
    }

    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    if (!tokenHash || !type) {
      return errorResponse(
        PartnerErrorCode.INTERNAL_ERROR,
        'Invalid magic link.',
        500
      );
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data: session, error: sessionError } = await supabase
      .from('partner_sessions')
      .insert({
        partner_id: partnerId,
        academy_name,
        biz_number,
        rep_name,
        academy_address: academy_address ?? null,
        academy_phone: academy_phone ?? null,
        return_url,
        webhook_url: webhook_url ?? null,
        metadata: {
          ...(metadata ?? {}),
          _magic_link: {
            token_hash: tokenHash,
            type: type,
          },
        },
        service_type: 'SSO',
        status: 'PENDING',
        is_used: false,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (sessionError || !session) {
      return errorResponse(
        PartnerErrorCode.INTERNAL_ERROR,
        'Failed to create partner session.',
        500
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const launchUrl = `${baseUrl}/partner/launch?token=${session.session_token}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          session_token: session.session_token,
          launch_url: launchUrl,
          expires_at: session.expires_at,
          is_new_account: isNewAccount,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return errorResponse(
      PartnerErrorCode.INTERNAL_ERROR,
      error?.message || 'Unexpected error.',
      500
    );
  }
}
