import type {
  BuyerRequirementExtraction,
  CopilotActionProposal,
  LiveCopilotAnswer,
  SessionUser,
} from '@estateflow/shared';

export interface AiStatus {
  configured: boolean;
  verified: boolean;
  label: string;
  provider: string;
  model: string | null;
  setupGuidance: string | null;
}

export interface VisitBrief {
  label: string;
  visit: { id: string; scheduledAt: string; status: string; meetingPoint: string; href: string };
  buyer: { id: string; name: string; href: string; localities: string[]; bedrooms: number | null; budgetMaxInr: number | null; mustHave: string | null; flexible: string | null } | null;
  lead: { id: string; name: string; href: string; requirement: string | null; budgetBand: string | null; timeline: string | null; financing: string | null } | null;
  property: { id: string; title: string; href: string; locality: string; bedrooms: number | null; priceInr: number | null; area: string | null; furnishing: string | null; possession: string | null; lastConfirmedAt: string | null } | null;
  recentInteractions: { type: string; title: string; at: string }[];
  toConfirm: string[];
}

export interface InboxStatus {
  whatsapp: { state: 'not_connected' | 'setup_required' | 'awaiting_webhook' | 'connected'; label: string; credentialsConfigured: boolean; lastVerifiedWebhookAt: string | null; displayName: string | null };
  facebook_messenger: { state: string; label: string };
  instagram: { state: string; label: string };
}

export interface LiveConversation {
  id: string;
  channel: string;
  contactName: string;
  unread: boolean;
  leadId: string | null;
  optOut: boolean;
  updatedAt?: string;
  lastMessage?: { text: string; direction: string; eventAt: string } | null;
}

export interface LiveMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  senderLabel: string | null;
  text: string;
  deliveryStatus: string | null;
  eventAt: string;
}

export interface LiveExtraction {
  sourceMessageId: string | null;
  receivedAt?: string;
  draft: BuyerRequirementExtraction | null;
  lead: { id: string; name: string; href: string } | null;
  conflicts: { field: string; saved: string | null; proposed: string | null }[];
}

export interface DeliveryStatusView {
  background: 'sqs' | 'unavailable';
  message: string;
  summary: string;
  channels: Record<'email' | 'sms' | 'push', { configured: boolean; provider: string | null }>;
}

export interface DeliveryRow {
  id: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'dismissed';
  attempts: number;
  lastError: string | null;
  updatedAt: string;
  notification?: { id: string; title: string };
}

function apiBase() {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return '/backend';
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) return;
  localStorage.removeItem('ef_access_token');
}

export function getPendingSubjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('ef_pending_subject');
}

export function setPendingSubjectId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) sessionStorage.setItem('ef_pending_subject', id);
  else sessionStorage.removeItem('ef_pending_subject');
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${apiBase()}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const nested = data.message && typeof data.message === 'object' ? data.message : null;
    const message =
      typeof data.message === 'string'
        ? data.message
        : nested && typeof nested.message === 'string'
          ? nested.message
          : Array.isArray(data.message)
            ? data.message[0]
            : 'Request failed';
    const code =
      typeof data.code === 'string'
        ? data.code
        : nested && typeof nested.code === 'string'
          ? nested.code
          : undefined;
    throw new ApiError(message, res.status, code, data);
  }
  return data as T;
}

export const api = {
  getAuthMode: () => request<{ provider: string; label: string; configured: boolean }>('/auth/mode', { auth: false }),
  signUp: (body: { email: string; password: string; role: 'dealer' | 'builder' }) =>
    request<{
      subjectId: string;
      devVerifyCode?: string;
      requiresVerification: boolean;
    }>('/auth/signup', { method: 'POST', body: JSON.stringify(body), auth: false }),
  verify: (body: { subjectId?: string; email?: string; code: string }) =>
    request<{ verified: boolean }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    }),
  forgotPassword: (body: { email: string }) =>
    request<{ ok: boolean; message: string; resetCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    }),
  resetPassword: (body: { email: string; code: string; password: string }) =>
    request<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    }),
  signIn: (body: { email: string; password: string }) =>
    request<{ user: SessionUser; authMode: { label: string; configured: boolean } }>(
      '/auth/signin',
      { method: 'POST', body: JSON.stringify(body), auth: false },
    ),
  signOut: () => request<{ ok: boolean }>('/auth/signout', { method: 'POST' }),
  me: () => request<SessionUser>('/auth/me'),
  getOnboarding: () =>
    request<{ status: string; profile: unknown; completionPercent: number }>('/dealer/onboarding'),
  saveOnboarding: (body: Record<string, unknown>) =>
    request('/dealer/onboarding', { method: 'PATCH', body: JSON.stringify(body) }),
  submitOnboarding: (body: Record<string, unknown>) =>
    request('/dealer/onboarding/submit', { method: 'POST', body: JSON.stringify(body) }),
  dashboardOverview: () =>
    request<{
      definitions: Record<string, string>;
      leadsByStatus: { status: string; count: number }[];
      followUpsDue: number;
      upcomingVisits: number;
      activeDeals: number;
      estimatedPipeline: string;
      expectedCommission: string;
      totalLeads: number;
      isEmpty: boolean;
      priorities?: {
        id: string;
        kind: string;
        tone: 'critical' | 'warn' | 'info';
        title: string;
        reason: string;
        href: string;
        actionLabel: string;
        actionHref: string;
        extraHref?: string;
        extraLabel?: string;
      }[];
      todayVisits?: {
        id: string;
        scheduledAt: string;
        status: string;
        meetingPoint: string;
        buyer: string | null;
        property: string | null;
        locality: string | null;
        href: string;
      }[];
      pipeline?: { stage: string; count: number; value: string }[];
      staleInventory?: number;
    }>('/dashboard/overview'),
  listProperties: (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    return request<{ items: PropertyRow[]; total: number; notice?: string }>(`/properties?${q}`);
  },
  getProperty: (id: string) => request<PropertyRow>(`/properties/${id}`),
  createProperty: (body: Record<string, unknown>) =>
    request<PropertyRow>('/properties', { method: 'POST', body: JSON.stringify(body) }),
  updateProperty: (id: string, body: Record<string, unknown>) =>
    request<PropertyRow>(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archiveProperty: (id: string) =>
    request<PropertyRow>(`/properties/${id}/archive`, { method: 'POST' }),
  listBuyers: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    return request<{ items: BuyerRow[]; total: number }>(`/buyers?${q}`);
  },
  getBuyer: (id: string) => request<BuyerRow>(`/buyers/${id}`),
  createBuyer: (body: Record<string, unknown>) =>
    request<BuyerRow>('/buyers', { method: 'POST', body: JSON.stringify(body) }),
  matchForBuyer: (buyerId: string, params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v !== undefined) q.set(k, String(v));
    });
    return request<{ items: MatchItem[]; weights: Record<string, number> }>(
      `/matching/buyer/${buyerId}?${q}`,
    );
  },
  matchForProperty: (propertyId: string) =>
    request<{ items: MatchItemBuyer[] }>(`/matching/property/${propertyId}`),
  shortlistMatch: (buyerId: string, propertyId: string) =>
    request(`/matching/shortlist/${buyerId}/${propertyId}`, { method: 'POST' }),
  draftMessage: (buyerId: string, propertyId: string) =>
    request<{ draftText: string }>(`/matching/draft-message/${buyerId}/${propertyId}`, {
      method: 'POST',
    }),
  updateVisitFeedback: (id: string, body: Record<string, unknown>) =>
    request<SiteVisitRow>(`/site-visits/${id}/feedback`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateSiteVisit: (id: string, body: Record<string, unknown>) =>
    request<SiteVisitRow>(`/site-visits/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listNotifications: () =>
    request<{ id: string; kind: string; title: string; body: string; readAt: string | null; createdAt: string }[]>(
      '/notifications',
    ),
  markNotificationRead: (id: string) => request<{ updated: number }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<{ updated: number }>('/notifications/read-all', { method: 'PATCH' }),
  listSiteVisits: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v !== undefined) q.set(k, String(v));
    });
    return request<{ items: SiteVisitRow[] }>(`/site-visits?${q}`);
  },
  createSiteVisit: (body: Record<string, unknown>) =>
    request('/site-visits', { method: 'POST', body: JSON.stringify(body) }),
  listDeals: (view: 'kanban' | 'table' = 'table') =>
    request<{ items?: DealRow[]; columns?: { stage: string; deals: DealRow[] }[] }>(
      `/deals?view=${view}`,
    ),
  updateDealStage: (id: string, body: Record<string, unknown>) =>
    request(`/deals/${id}/stage`, { method: 'PATCH', body: JSON.stringify(body) }),
  commissionSummary: () => request('/commissions/summary'),
  networkDirectory: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params ?? {});
    return request(`/network/directory?${q}`);
  },
  networkPassport: () => request('/network/passport'),
  networkInvite: (body: Record<string, unknown>) =>
    request('/network/invites', { method: 'POST', body: JSON.stringify(body) }),
  networkReport: (body: Record<string, unknown>) =>
    request('/network/reports', { method: 'POST', body: JSON.stringify(body) }),
  listLeads: (params: Record<string, string | number | boolean | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    return request<{
      items: LeadRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/leads?${q.toString()}`);
  },
  getLead: (id: string) => request<LeadDetail>(`/leads/${id}`),
  createLead: (body: Record<string, unknown>) =>
    request<LeadRow>('/leads', { method: 'POST', body: JSON.stringify(body) }),
  updateLead: (id: string, body: Record<string, unknown>) =>
    request<LeadRow>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archiveLead: (id: string) => request(`/leads/${id}/archive`, { method: 'POST' }),
  search: (q: string) =>
    request<{ items: { type: string; id: string; title: string; subtitle: string }[]; total: number }>(
      `/search?q=${encodeURIComponent(q)}`,
    ),
  copilotStatus: () => request<AiStatus>('/copilot/status'),
  copilotChat: (
    message: string,
    extra?: { conversationId?: string; pageContext?: { type?: string; id?: string } },
  ) =>
    request<LiveCopilotAnswer>('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId: extra?.conversationId, pageContext: extra?.pageContext }),
    }),
  copilotConfirm: (proposal: CopilotActionProposal) =>
    request<{ ok: boolean; leadId: string; nextFollowUpAt: string; href: string; visitId?: string; alreadyApplied?: boolean }>(
      '/copilot/actions/confirm',
      {
        method: 'POST',
        body: JSON.stringify({
          kind: proposal.kind,
          leadId: proposal.leadId,
          dueAt: proposal.dueAt,
          note: proposal.note,
          propertyId: proposal.propertyId,
          confirm: true,
        }),
      },
    ),
  visitBrief: (visitId: string) => request<VisitBrief>(`/copilot/visit-brief/${visitId}`),
  visitSummary: (visitId: string, notes: string) =>
    request<{ visitId: string; summary: string; label: string }>('/copilot/visit-summary', {
      method: 'POST',
      body: JSON.stringify({ visitId, notes }),
    }),
  inboxStatus: () => request<InboxStatus>('/inbox/status'),
  connectWhatsApp: () => request<InboxStatus>('/inbox/whatsapp/connect', { method: 'POST', body: JSON.stringify({ confirm: true }) }),
  inboxConversations: () => request<LiveConversation[]>('/inbox/conversations'),
  inboxThread: (id: string) => request<{ conversation: LiveConversation; messages: LiveMessage[] }>(`/inbox/conversations/${id}`),
  inboxExtraction: (id: string) => request<LiveExtraction>(`/inbox/conversations/${id}/extraction`),
  inboxSaveExtraction: (id: string, body: Record<string, unknown>) =>
    request<{ leadId: string; created: boolean; updated: string[]; skipped: string[]; href: string }>(
      `/inbox/conversations/${id}/extraction/save`,
      { method: 'POST', body: JSON.stringify({ ...body, confirm: true }) },
    ),
  inboxSend: (id: string, text: string, idempotencyKey: string) =>
    request<{ messageId: string; deliveryStatus: string }>(`/inbox/conversations/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ text, idempotencyKey, confirm: true }),
    }),
  deliveryStatus: () => request<DeliveryStatusView>('/notifications/delivery-status'),
  deliveries: (status?: string) => request<DeliveryRow[]>(`/notifications/deliveries${status ? `?status=${status}` : ''}`),
  retryDelivery: (id: string) => request<DeliveryRow>(`/notifications/deliveries/${id}/retry`, { method: 'POST' }),
  dismissDelivery: (id: string) => request<DeliveryRow>(`/notifications/deliveries/${id}/dismiss`, { method: 'POST' }),
  tourStatus: () => request<TourSetupStatus>('/reconstruction/status'),
  listTourJobs: (propertyId?: string) => request<TourJob[]>(`/reconstruction/jobs${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}`),
  getTourJob: (id: string) => request<TourJob>(`/reconstruction/jobs/${id}`),
  createTourJob: (body: { propertyId: string; idempotencyKey: string; fileName: string; mime: string; size: number; durationSeconds: number | null; captureNotes: string; consent: boolean }) =>
    request<TourJob>('/reconstruction/jobs', { method: 'POST', body: JSON.stringify(body) }),
  tourUploadUrl: (id: string) =>
    request<{ method: 'PUT'; url: string; headers: Record<string, string>; expiresInSeconds: number }>(`/reconstruction/jobs/${id}/upload-url`, { method: 'POST' }),
  completeTourUpload: (id: string) => request<TourJob>(`/reconstruction/jobs/${id}/complete`, { method: 'POST' }),
  submitTourJob: (id: string) => request<TourJob>(`/reconstruction/jobs/${id}/submit`, { method: 'POST' }),
  tourMedia: (id: string) => request<TourMedia>(`/reconstruction/jobs/${id}/media`),
  attachTour: (id: string) => request<TourJob>(`/reconstruction/jobs/${id}/attach`, { method: 'POST' }),
  detachTour: (id: string) => request<TourJob>(`/reconstruction/jobs/${id}/detach`, { method: 'POST' }),
  tourShareLinks: (id: string) => request<TourShareLinkRow[]>(`/reconstruction/jobs/${id}/share-links`),
  createTourShareLink: (id: string, expiresInDays: number) =>
    request<{ id: string; token: string; path: string; expiresAt: string }>(`/reconstruction/jobs/${id}/share-links`, { method: 'POST', body: JSON.stringify({ expiresInDays }) }),
  revokeTourShareLink: (linkId: string) => request<{ id: string; revoked: boolean }>(`/reconstruction/share-links/${linkId}/revoke`, { method: 'POST' }),
  sharedTour: (token: string) => request<SharedTourView>(`/tours/shared/${encodeURIComponent(token)}`),
  systemSetup: () => request<SystemSetup>('/system/setup'),
  builderWorkspace: () => request<import('@estateflow/shared').BuilderWorkspace>('/builder/workspace'),
  builderAction: (body: import('@estateflow/shared').BuilderAction) =>
    request<import('@estateflow/shared').BuilderWorkspace>('/builder/actions', { method: 'POST', body: JSON.stringify(body) }),
  builderCreateLead: (body: import('@estateflow/shared').LeadInput) =>
    request<import('@estateflow/shared').BuilderWorkspace>('/builder/leads', { method: 'POST', body: JSON.stringify(body) }),
  builderUploadIntent: (body: { projectId: string; contentType: string; size: number }) =>
    request<{ storage: string; label?: string; guidance?: string[]; url?: string; headers?: Record<string, string>; objectKey?: string; expiresInSeconds?: number }>('/builder/media/upload-intent', { method: 'POST', body: JSON.stringify(body) }),
  dealerBuilderLeads: () => request<import('@estateflow/shared').DealerLeadView[]>('/dealer/builder-leads'),
  respondBuilderLead: (assignmentId: string, body: { decision: 'accept' | 'decline'; reason?: string }) =>
    request('/dealer/builder-leads/' + assignmentId + '/respond', { method: 'POST', body: JSON.stringify(body) }),
  askBuilder: (assignmentId: string, note: string) =>
    request('/dealer/builder-leads/' + assignmentId + '/ask', { method: 'POST', body: JSON.stringify({ note }) }),
};

export interface SystemSetup {
  env: 'local' | 'staging' | 'production';
  integrations: { key: string; name: string; state: string; label: string; requiredEnv: string[]; note: string }[];
}

/** PUT straight to the presigned storage URL. No cookies or API credentials are sent. */
export function uploadToSignedUrl(url: string, file: File, headers: Record<string, string>, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.withCredentials = false;
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError(`Storage rejected the upload (HTTP ${xhr.status}).`, xhr.status, 'upload_rejected')));
    xhr.onerror = () => reject(new ApiError('The upload could not reach storage. Check the connection and bucket CORS settings.', 0, 'upload_network'));
    xhr.send(file);
  });
}

export interface TourSetupStatus {
  storage: { configured: boolean; label: string; setupGuidance: string[] };
  provider: { name: string; configured: boolean; verified: boolean; label: string; setupGuidance: string[] };
  limits: { maxBytes: number; mimeTypes: string[]; extensions: string[]; minSeconds: number; maxSeconds: number };
  guidance: string[];
  shareLinkMaxDays: number;
}

export interface TourJob {
  id: string;
  propertyId: string;
  property?: { title: string; locality: string };
  status: string;
  statusLabel: string;
  provider: string;
  errorCategory: string | null;
  providerMessage: string | null;
  progress: number | null;
  fileName: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  captureNotes: string | null;
  consentAt: string | null;
  uploadedAt: string | null;
  hasVideo: boolean;
  hasModel: boolean;
  attachedAt: string | null;
  createdAt: string;
}

export interface TourMedia {
  model: { url: string; expiresInSeconds: number } | null;
  video: { url: string; expiresInSeconds: number } | null;
  storageConfigured: boolean;
}

export interface TourShareLinkRow {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

export interface SharedTourView {
  property: { title: string; locality: string };
  expiresAt: string;
  model: { url: string; expiresInSeconds: number } | null;
  video: { url: string; expiresInSeconds: number } | null;
}

export interface LeadRow {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  budgetBand?: string | null;
  preferredLocalities: string[];
  nextFollowUpAt?: string | null;
  requirementSummary?: string | null;
  updatedAt: string;
}

export interface PropertyRow {
  id: string;
  title: string;
  locality: string;
  propertyType: string;
  listingStatus: string;
  priceAmount?: string | number | null;
  bedrooms?: number | null;
  isVerifiedListing: boolean;
  transactionType: string;
  lastConfirmedAt?: string | null;
  photoUrls?: string[];
  addressText?: string | null;
  notes?: string | null;
  areaValue?: string | number | null;
  areaUnit?: string | null;
  furnishing?: string | null;
  possessionNotes?: string | null;
}

export interface BuyerRow {
  id: string;
  contactName: string;
  phone: string;
  localities: string[];
  propertyTypes: string[];
  budgetMin?: string | null;
  budgetMax?: string | null;
  readiness: string;
  transactionType: string;
  leadId?: string | null;
}

export interface MatchItem {
  property: PropertyRow;
  matchPercent: number;
  breakdown: Record<string, number | 'unknown'>;
  explanation: string;
}

export interface MatchItemBuyer {
  buyer: BuyerRow;
  matchPercent: number;
  breakdown: Record<string, number | 'unknown'>;
}

export interface SiteVisitRow {
  id: string;
  scheduledAt: string;
  status: string;
  meetingPoint: string;
  property?: PropertyRow | null;
  buyerRequirement?: BuyerRow | null;
}

export interface DealRow {
  id: string;
  title: string;
  pipelineStage: string;
  value?: string | null;
  property?: PropertyRow | null;
  buyerRequirement?: BuyerRow | null;
}

export interface LeadDetail extends LeadRow {
  propertyType?: string | null;
  transactionType?: string | null;
  timeline?: string | null;
  financingNotes?: string | null;
  notes?: string | null;
  activities: { id: string; title: string; body?: string | null; createdAt: string }[];
  siteVisits: unknown[];
  deals: unknown[];
}
