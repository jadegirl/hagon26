import { supabase } from '@/lib/supabase';

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Partner-Id, X-Timestamp, X-Signature',
};

export const getPartnerCorsHeaders = async (
  requestOrigin?: string | null,
  partnerId?: string | null
): Promise<Record<string, string>> => {
  if (!requestOrigin) {
    return { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': '' };
  }

  // partnerId가 있으면 해당 파트너의 allowed_domains 확인
  if (partnerId) {
    const { data: partner } = await supabase
      .from('partners')
      .select('allowed_domains')
      .eq('partner_id', partnerId)
      .single();

    if (partner?.allowed_domains) {
      const origins: string[] = Array.isArray(partner.allowed_domains)
        ? partner.allowed_domains
        : [];
      if (origins.includes(requestOrigin)) {
        return {
          ...BASE_CORS_HEADERS,
          'Access-Control-Allow-Origin': requestOrigin,
          Vary: 'Origin',
        };
      }
    }
  }

  // partnerId 없는 경우 (OPTIONS 등): 전체 파트너 allowed_domains에서 검색
  const { data: partners } = await supabase
    .from('partners')
    .select('allowed_domains')
    .eq('is_active', true);

  if (partners) {
    const allOrigins = partners.flatMap(
      (p) => (Array.isArray(p.allowed_domains) ? p.allowed_domains : []) as string[]
    );
    if (allOrigins.includes(requestOrigin)) {
      return {
        ...BASE_CORS_HEADERS,
        'Access-Control-Allow-Origin': requestOrigin,
        Vary: 'Origin',
      };
    }
  }

  return { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': '' };
};
