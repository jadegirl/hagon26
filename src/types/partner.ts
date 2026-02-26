export type PartnerSessionStatus =
  | 'PENDING'
  | 'LAUNCHED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'EXPIRED';

export type PartnerSession = {
  session_token: string;
  partner_id: string;
  academy_name: string;
  biz_number: string;
  rep_name: string;
  academy_address?: string | null;
  academy_phone?: string | null;
  return_url: string;
  webhook_url?: string | null;
  service_type?: string | null;
  metadata?: Record<string, any> | null;
  status: PartnerSessionStatus;
  is_used: boolean;
  contract_id?: string | null;
  expires_at: string;
  created_at: string;
};

export type CreateSessionRequest = {
  academy_name: string;
  biz_number: string;
  rep_name: string;
  academy_address?: string;
  academy_phone?: string;
  return_url: string;
  webhook_url?: string;
  service_type?: 'CONTRACT';
  metadata?: Record<string, any>;
};

export type CreateSessionResponse = {
  success: true;
  data: {
    session_token: string;
    launch_url: string;
    expires_at: string;
  };
};

export enum PartnerErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED_TIMESTAMP = 'EXPIRED_TIMESTAMP',
  INVALID_PARTNER = 'INVALID_PARTNER',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_BIZ_NUMBER = 'INVALID_BIZ_NUMBER',
  INVALID_SERVICE_TYPE = 'INVALID_SERVICE_TYPE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export type PartnerErrorResponse = {
  success: false;
  error: {
    code: PartnerErrorCode;
    message: string;
  };
};
