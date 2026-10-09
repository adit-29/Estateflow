export type MessagingChannel = 'whatsapp' | 'instagram' | 'facebook_messenger';

export interface NormalizedMessage {
  channel: MessagingChannel;
  conversationExternalId: string;
  providerMessageId?: string;
  direction: 'inbound' | 'outbound';
  senderLabel?: string;
  text: string;
  eventAt: string;
  deliveryStatus?: string;
}

export interface MessagingProvider {
  readonly channel: MessagingChannel;
  readonly mode: 'mock' | 'unconfigured' | 'configured';
  sendText(input: { to: string; text: string }): Promise<{ providerMessageId: string; status: string }>;
}

export function providerMode(required: string[]): 'unconfigured' | 'configured' {
  return required.every((k) => Boolean(process.env[k])) ? 'configured' : 'unconfigured';
}
