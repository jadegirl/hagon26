import { supabase } from '@/lib/supabase';
import type { CreateSessionRequest, PartnerSession } from '@/types/partner';

type SessionResult = {
  session: PartnerSession | null;
  error?: string;
};

export const createPartnerSession = async (
  partnerId: string,
  request: CreateSessionRequest
): Promise<{ session: PartnerSession | null; launch_url?: string; error?: string }> => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const serviceType = request.service_type ?? 'CONTRACT';

  const { data, error } = await supabase
    .from('partner_sessions')
    .insert({
      partner_id: partnerId,
      academy_name: request.academy_name,
      biz_number: request.biz_number,
      rep_name: request.rep_name,
      academy_address: request.academy_address ?? null,
      academy_phone: request.academy_phone ?? null,
      return_url: request.return_url,
      webhook_url: request.webhook_url ?? null,
      service_type: serviceType,
      metadata: request.metadata ?? null,
      status: 'PENDING',
      is_used: false,
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { session: null, error: 'SESSION_INSERT_FAILED' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const launch_url = `${baseUrl}/partner/launch?token=${data.session_token}`;

  return { session: data as PartnerSession, launch_url };
};

export const verifySessionToken = async (token: string): Promise<SessionResult> => {
  const { data, error } = await supabase
    .from('partner_sessions')
    .select('*')
    .eq('session_token', token)
    .single();

  if (error || !data) {
    return { session: null, error: 'SESSION_NOT_FOUND' };
  }

  const now = new Date();
  if (data.expires_at && new Date(data.expires_at) < now) {
    return { session: null, error: 'SESSION_EXPIRED' };
  }

  if (data.is_used) {
    return { session: null, error: 'SESSION_ALREADY_USED' };
  }

  return { session: data as PartnerSession };
};

export const markSessionUsed = async (token: string): Promise<SessionResult> => {
  const { data, error } = await supabase
    .from('partner_sessions')
    .update({ is_used: true, status: 'LAUNCHED' })
    .eq('session_token', token)
    .select('*')
    .single();

  if (error || !data) {
    return { session: null, error: 'SESSION_UPDATE_FAILED' };
  }

  return { session: data as PartnerSession };
};

export const completeSession = async (
  token: string,
  contract_id: string
): Promise<SessionResult> => {
  const { data, error } = await supabase
    .from('partner_sessions')
    .update({
      status: 'COMPLETED',
      contract_id,
      completed_at: new Date().toISOString(),
      is_used: true,
    })
    .eq('session_token', token)
    .select('*')
    .single();

  if (error || !data) {
    return { session: null, error: 'SESSION_UPDATE_FAILED' };
  }

  return { session: data as PartnerSession };
};

export const cancelSession = async (token: string): Promise<SessionResult> => {
  const { data, error } = await supabase
    .from('partner_sessions')
    .update({ status: 'CANCELED' })
    .eq('session_token', token)
    .select('*')
    .single();

  if (error || !data) {
    return { session: null, error: 'SESSION_UPDATE_FAILED' };
  }

  return { session: data as PartnerSession };
};
