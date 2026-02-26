import { createHmac } from 'crypto';

type WebhookResult = {
  success: boolean;
  statusCode?: number;
  error?: string;
};

export const sendPartnerWebhook = async (
  webhookUrl: string,
  partnerSecret: string,
  event: string,
  data: Record<string, any>
): Promise<WebhookResult> => {
  const body = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const payload = JSON.stringify(body);
  const signature = createHmac('sha256', partnerSecret).update(payload).digest('hex');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hagon-Signature': signature,
        'X-Hagon-Event': event,
      },
      body: payload,
    });

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: `Webhook responded with status ${response.status}`,
      };
    }

    return { success: true, statusCode: response.status };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Webhook request failed' };
  }
};

export const sendPartnerWebhookWithRetry = async (
  webhookUrl: string,
  partnerSecret: string,
  event: string,
  data: Record<string, any>,
  maxRetries: number = 5
): Promise<WebhookResult & { attempts: number }> => {
  const firstResult = await sendPartnerWebhook(webhookUrl, partnerSecret, event, data);
  if (firstResult.success) {
    return { ...firstResult, attempts: 1 };
  }

  let lastResult = firstResult;
  for (let retryIndex = 0; retryIndex < maxRetries - 1; retryIndex += 1) {
    const delay = Math.pow(2, retryIndex) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    lastResult = await sendPartnerWebhook(webhookUrl, partnerSecret, event, data);
    if (lastResult.success) {
      return { ...lastResult, attempts: retryIndex + 2 };
    }
  }

  return { ...lastResult, attempts: maxRetries };
};
