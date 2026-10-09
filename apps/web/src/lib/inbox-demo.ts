'use client';

export type InboxChannel = 'whatsapp' | 'instagram' | 'facebook_messenger';

export interface InboxMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  at: string;
  status: 'received' | 'demo_reply_added';
  aiDraft?: boolean;
}

export interface InboxNote {
  id: string;
  text: string;
  at: string;
}

export interface InboxConversation {
  id: string;
  channel: InboxChannel;
  contactName: string;
  unread: boolean;
  assignedDealer?: string;
  linkedLeadId?: string | null;
  linkedLeadName?: string | null;
  optOut: boolean;
  followUpDue?: string | null;
  followUpDone: boolean;
  notes: InboxNote[];
  messages: InboxMessage[];
}

const KEY = 'ef_inbox_demo_v1';

function seed(): InboxConversation[] {
  return [
    {
      id: 'c-wa-1',
      channel: 'whatsapp',
      contactName: 'Rohit Malhotra',
      unread: true,
      assignedDealer: 'Demo Dealer',
      linkedLeadId: null,
      linkedLeadName: null,
      optOut: false,
      followUpDue: new Date().toISOString().slice(0, 10),
      followUpDone: false,
      notes: [],
      messages: [
        {
          id: 'm1',
          direction: 'inbound',
          text: 'Dwarka ya Janakpuri mein 1.3 crore tak 3BHK chahiye. Loan lunga, ready-to-move ho toh better.',
          at: new Date(Date.now() - 3600_000).toISOString(),
          status: 'received',
        },
      ],
    },
    {
      id: 'c-ig-1',
      channel: 'instagram',
      contactName: 'neha.homes',
      unread: true,
      linkedLeadId: null,
      linkedLeadName: null,
      optOut: false,
      followUpDone: false,
      notes: [],
      messages: [
        {
          id: 'm2',
          direction: 'inbound',
          text: 'Is the Whitefield 3BHK still available? Budget around 1.2 crore.',
          at: new Date(Date.now() - 7200_000).toISOString(),
          status: 'received',
        },
      ],
    },
    {
      id: 'c-fb-1',
      channel: 'facebook_messenger',
      contactName: 'Amit Kapoor',
      unread: false,
      assignedDealer: 'Demo Dealer',
      linkedLeadId: 'l1',
      linkedLeadName: 'Ananya Sharma',
      optOut: false,
      followUpDone: false,
      notes: [{ id: 'n1', text: 'Asked for a weekend visit.', at: new Date().toISOString() }],
      messages: [
        {
          id: 'm3',
          direction: 'inbound',
          text: 'Can someone call me about Koramangala listings?',
          at: new Date(Date.now() - 86400_000).toISOString(),
          status: 'received',
        },
      ],
    },
  ];
}

export function loadInbox(): InboxConversation[] {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as InboxConversation[];
    return Array.isArray(parsed) && parsed.length ? parsed : seed();
  } catch {
    return seed();
  }
}

export function saveInbox(items: InboxConversation[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function channelLabel(channel: InboxChannel): string {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'instagram') return 'Instagram';
  return 'Facebook Messenger';
}
