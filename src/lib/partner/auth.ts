import { createHmac, timingSafeEqual } from 'crypto';

import { supabase } from '@/lib/supabase';

type Partner = {
  id: string;
  partner_id: string;
  partner_secret: string;
  is_active: boolean;
  monthly_usage: number | null;
  monthly_quota: number | null;
};

type VerifyPartnerSignatureArgs = {
  partnerId: string;
  timestamp: string;
  body: Record<string, any>;
  signature: string;
};

type VerifyPartnerSignatureResult = {
  valid: boolean;
  partner: Partner | null;
  error?: string;
};

const TIMESTAMP_TOLERANCE_SECONDS = 300;

export const verifyPartnerSignature = async (
  args: VerifyPartnerSignatureArgs
): Promise<VerifyPartnerSignatureResult> => {
  const { partnerId, timestamp, body, signature } = args;
  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    return { valid: false, partner: null, error: 'INVALID_TIMESTAMP' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - parsedTimestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    return { valid: false, partner: null, error: 'EXPIRED_TIMESTAMP' };
  }

  const { data: partner, error } = await supabase
    .from('partners')
    .select('id, partner_id, partner_secret, is_active, monthly_usage, monthly_quota')
    .eq('partner_id', partnerId)
    .single();

  if (error || !partner) {
    return { valid: false, partner: null, error: 'INVALID_PARTNER' };
  }

  if (!partner.is_active) {
    return { valid: false, partner, error: 'PARTNER_INACTIVE' };
  }

  const payload = `${partnerId}.${timestamp}.${JSON.stringify(body)}`;
  const expected = createHmac('sha256', partner.partner_secret).update(payload).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== signatureBuffer.length) {
    return { valid: false, partner, error: 'INVALID_SIGNATURE' };
  }

  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return { valid: false, partner, error: 'INVALID_SIGNATURE' };
  }

  return { valid: true, partner };
};
