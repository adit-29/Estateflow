import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { MessagingProvider } from './provider.types';
import { providerMode } from './provider.types';

@Injectable()
export class MockMessagingProvider implements MessagingProvider {
  readonly channel = 'whatsapp' as const;
  readonly mode = 'mock' as const;

  async sendText() {
    return { providerMessageId: `mock_${Date.now()}`, status: 'demo_reply_added' };
  }
}

export const WHATSAPP_REQUIRED_ENV = [
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'META_APP_SECRET',
];

/** WhatsApp Business Platform Cloud API. Credentials are read from server env only. */
@Injectable()
export class WhatsAppCloudApiProvider implements MessagingProvider {
  readonly channel = 'whatsapp' as const;
  fetchImpl: typeof fetch = (input, init) => fetch(input, init);

  get mode() {
    return providerMode(WHATSAPP_REQUIRED_ENV);
  }

  get phoneNumberId() {
    return process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
  }

  async sendText(input: { to: string; text: string }): Promise<{ providerMessageId: string; status: string }> {
    if (this.mode !== 'configured' || !this.phoneNumberId) {
      throw new ServiceUnavailableException({
        message: 'WhatsApp is not connected. Server credentials are missing.',
        code: 'whatsapp_not_configured',
      });
    }
    const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v21.0';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await this.fetchImpl(`https://graph.facebook.com/${version}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.to,
          type: 'text',
          text: { preview_url: false, body: input.text },
        }),
      });
    } catch {
      throw new ServiceUnavailableException({ message: 'WhatsApp could not be reached. The message was not sent.', code: 'whatsapp_unreachable' });
    } finally {
      clearTimeout(timer);
    }
    const body = (await response.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
    const id = body?.messages?.[0]?.id;
    if (!response.ok || !id) {
      throw new ServiceUnavailableException({
        message: `WhatsApp rejected the message (HTTP ${response.status}). It was not sent.`,
        code: 'whatsapp_rejected',
      });
    }
    return { providerMessageId: id, status: 'accepted' };
  }
}

@Injectable()
export class FacebookMessengerProvider implements MessagingProvider {
  readonly channel = 'facebook_messenger' as const;
  get mode() {
    return providerMode(['FACEBOOK_PAGE_ID', 'META_APP_SECRET']);
  }

  async sendText(_input: {
    to: string;
    text: string;
  }): Promise<{ providerMessageId: string; status: string }> {
    throw new ServiceUnavailableException(
      'Facebook Page Messenger is not connected. Complete Page authorization and App Review before sending.',
    );
  }
}

@Injectable()
export class InstagramMessagingProvider implements MessagingProvider {
  readonly channel = 'instagram' as const;
  get mode() {
    return providerMode(['INSTAGRAM_BUSINESS_ACCOUNT_ID', 'META_APP_SECRET']);
  }

  async sendText(_input: {
    to: string;
    text: string;
  }): Promise<{ providerMessageId: string; status: string }> {
    throw new ServiceUnavailableException(
      'Instagram messaging is only available for professional accounts after Meta app review. Not connected.',
    );
  }
}
