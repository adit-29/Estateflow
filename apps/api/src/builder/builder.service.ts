import { HttpException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BuilderRuleError,
  applyBuilderAction,
  answerBuilderQuestion,
  builderAnalytics,
  createBuilderReconstructionProvider,
  dealerLeadViews,
  draftDealerMessage,
  leadRoutingRows,
  matchBuyerRequirement,
  pageItems,
  qualitySignals,
  rankDealers,
  requirementFromLead,
  type AccessPermission,
  type AssignmentMode,
  type BuilderAction,
  type BuilderWorkspace,
  type DeclineReason,
  type LeadInput,
  type MediaInput,
  type NotificationPrefs,
  type ProjectInput,
  type TourInput,
} from '@estateflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_SETUP_GUIDANCE, createTourStorage } from '../reconstruction/tour-storage';
import { loadBuilderWorkspace, saveBuilderWorkspace, withOrganization } from './builder.persistence';

@Injectable()
export class BuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async workspace(organizationId: string, accountId: string): Promise<BuilderWorkspace> {
    return this.mutate(organizationId, accountId, { type: 'sweep_timeouts' });
  }

  async apply(organizationId: string, accountId: string, action: BuilderAction): Promise<BuilderWorkspace> {
    return this.mutate(organizationId, accountId, action);
  }

  async createLead(organizationId: string, accountId: string, lead: LeadInput): Promise<BuilderWorkspace> {
    return this.apply(organizationId, accountId, { type: 'create_lead', lead });
  }

  async listProjects(organizationId: string, accountId: string, page?: number, pageSize?: number) {
    const ws = await this.workspace(organizationId, accountId);
    return pageItems(ws.projects, this.pageArgs(page, pageSize).page, this.pageArgs(page, pageSize).pageSize);
  }

  async getProject(organizationId: string, accountId: string, projectId: string) {
    const ws = await this.workspace(organizationId, accountId);
    const project = ws.projects.find((item) => item.id === projectId);
    if (!project) throw this.fail(new BuilderRuleError('Project not found.', 'not_found'));
    return project;
  }

  async createProject(organizationId: string, accountId: string, project: ProjectInput) {
    const ws = await this.apply(organizationId, accountId, { type: 'create_project', project });
    return ws.projects[0];
  }

  async patchProject(organizationId: string, accountId: string, projectId: string, patch: Partial<ProjectInput>) {
    const ws = await this.apply(organizationId, accountId, { type: 'update_project', id: projectId, patch });
    return ws.projects.find((item) => item.id === projectId);
  }

  async addMedia(organizationId: string, accountId: string, projectId: string, media: Omit<MediaInput, 'projectId'>) {
    return this.apply(organizationId, accountId, { type: 'add_media', media: { ...media, projectId } });
  }

  async deleteMedia(organizationId: string, accountId: string, mediaId: string) {
    return this.apply(organizationId, accountId, { type: 'delete_media', id: mediaId });
  }

  async createTourJob(organizationId: string, accountId: string, tour: TourInput) {
    const ws = await this.apply(organizationId, accountId, { type: 'create_tour', tour });
    return ws.tours[0];
  }

  async getTourJob(organizationId: string, accountId: string, tourId: string) {
    const ws = await this.workspace(organizationId, accountId);
    const tour = ws.tours.find((item) => item.id === tourId);
    if (!tour) throw this.fail(new BuilderRuleError('3D tour not found.', 'not_found'));
    return tour;
  }

  async transitionTour(organizationId: string, accountId: string, tourId: string, to: 'approved' | 'published' | 'queued') {
    const ws = await this.apply(organizationId, accountId, { type: 'transition_tour', id: tourId, to });
    return ws.tours.find((item) => item.id === tourId);
  }

  async listDealers(organizationId: string, accountId: string, page?: number, pageSize?: number) {
    const ws = await this.workspace(organizationId, accountId);
    const args = this.pageArgs(page, pageSize);
    return pageItems(ws.dealers.map((dealer) => ({
      id: dealer.id,
      name: dealer.name,
      agencyName: dealer.agencyName,
      localities: dealer.localities,
      configurations: dealer.configurations,
      verified: dealer.verified,
      active: dealer.active,
      suspended: dealer.suspended,
      openLeads: dealer.openLeads,
      capacity: dealer.capacity,
    })), args.page, args.pageSize);
  }

  async grantAccess(organizationId: string, accountId: string, dealerId: string, body: { projectId: string; permissions: AccessPermission[]; expiresAt?: string | null }) {
    return this.apply(organizationId, accountId, {
      type: 'grant_access',
      access: { dealerId, projectId: body.projectId, permissions: body.permissions, expiresAt: body.expiresAt ?? null },
    });
  }

  async revokeAccess(organizationId: string, accountId: string, accessId: string) {
    return this.apply(organizationId, accountId, { type: 'revoke_access', id: accessId });
  }

  async listLeads(organizationId: string, accountId: string, query: { page?: number; pageSize?: number; projectId?: string; stage?: string; dealerId?: string }) {
    const ws = await this.workspace(organizationId, accountId);
    const args = this.pageArgs(query.page, query.pageSize);
    const rows = leadRoutingRows(ws).filter((row) => {
      if (query.projectId && row.projectId !== query.projectId) return false;
      if (query.stage && !row.buckets.includes(query.stage as never) && row.stage !== query.stage) return false;
      if (query.dealerId && row.dealerId !== query.dealerId) return false;
      return true;
    });
    return pageItems(rows, args.page, args.pageSize);
  }

  async recommendations(organizationId: string, accountId: string, leadId: string) {
    const ws = await this.workspace(organizationId, accountId);
    const lead = ws.leads.find((item) => item.id === leadId);
    if (!lead) throw this.fail(new BuilderRuleError('Lead not found.', 'not_found'));
    const match = matchBuyerRequirement(ws, requirementFromLead(lead));
    const ranked = rankDealers(ws, requirementFromLead(lead));
    return { note: match.note, units: match.units, dealers: ranked.eligible.slice(0, 5), excluded: ranked.excluded };
  }

  async assignLead(organizationId: string, accountId: string, leadId: string, body: { mode?: AssignmentMode; dealerId?: string }) {
    return this.apply(organizationId, accountId, { type: 'assign_lead', leadId, mode: body.mode ?? 'recommended', dealerId: body.dealerId });
  }

  async analytics(organizationId: string, accountId: string, projectId?: string) {
    const ws = await this.workspace(organizationId, accountId);
    return builderAnalytics(ws, projectId || null);
  }

  async assignmentRules(organizationId: string, accountId: string) {
    const ws = await this.workspace(organizationId, accountId);
    return ws.settings;
  }

  async patchAssignmentRules(organizationId: string, accountId: string, body: { mode?: AssignmentMode; responseWindowMinutes?: number; maxReassignments?: number; notifications?: Partial<NotificationPrefs> }) {
    const ws = await this.apply(organizationId, accountId, { type: 'update_settings', ...body });
    return ws.settings;
  }

  async quality(organizationId: string, accountId: string) {
    const ws = await this.workspace(organizationId, accountId);
    return qualitySignals(ws);
  }

  async audit(organizationId: string, accountId: string, page?: number, pageSize?: number) {
    const ws = await this.workspace(organizationId, accountId);
    const args = this.pageArgs(page, pageSize);
    return pageItems(ws.timeline, args.page, args.pageSize);
  }

  async copilot(organizationId: string, accountId: string, question: string) {
    if (!question?.trim()) throw this.fail(new BuilderRuleError('Enter a question.'));
    const ws = await this.workspace(organizationId, accountId);
    return answerBuilderQuestion(ws, question);
  }

  async dealerMessageDraft(organizationId: string, accountId: string, leadId: string) {
    const ws = await this.workspace(organizationId, accountId);
    const draft = draftDealerMessage(ws, leadId);
    if (!draft) throw this.fail(new BuilderRuleError('Lead not found.', 'not_found'));
    return { draft, label: 'Draft from the lead record.' };
  }

  async uploadIntent(organizationId: string, input: { projectId: string; contentType: string; size: number }) {
    const storage = createTourStorage();
    if (!storage.configured) {
      return {
        storage: 'metadata_only' as const,
        label: 'Local/demo storage — private object storage is not configured',
        guidance: STORAGE_SETUP_GUIDANCE,
      };
    }
    const objectKey = `builders/${organizationId}/projects/${input.projectId}/${randomUUID()}`;
    const signed = await storage.presignUpload({ key: objectKey, contentType: input.contentType, size: input.size });
    return { storage: 'private_s3' as const, objectKey, url: signed.url, headers: signed.headers, expiresInSeconds: signed.expiresInSeconds };
  }

  async viewUrl(organizationId: string, accountId: string, mediaId: string) {
    const ws = await withOrganization(this.prisma, organizationId, accountId, (tx) => loadBuilderWorkspace(tx, organizationId));
    const media = ws.media.find((item) => item.id === mediaId);
    if (!media) throw this.fail(new BuilderRuleError('Media not found.', 'not_found'));
    if (!media.objectKey) {
      return { storage: media.storage, url: null as string | null, label: 'File bytes are not in object storage.' };
    }
    const storage = createTourStorage();
    if (!storage.configured) throw this.fail(new BuilderRuleError('Private storage is not configured.', 'provider_not_configured'));
    const signed = await storage.presignView(media.objectKey, media.mimeType);
    return { storage: 'private_s3' as const, url: signed.url, expiresInSeconds: signed.expiresInSeconds };
  }

  async linkDealer(organizationId: string, accountId: string, dealerId: string, email: string) {
    const account = await this.prisma.account.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } } });
    if (!account || account.role !== 'dealer' || account.deletedAt) {
      throw this.fail(new BuilderRuleError('No dealer account uses that email.'));
    }
    const membership = await this.prisma.dealerMembership.findFirst({ where: { accountId: account.id } });
    if (!membership) throw this.fail(new BuilderRuleError('That dealer has not finished agency setup.'));
    return this.apply(organizationId, accountId, { type: 'set_dealer_agency', dealerId, agencyId: membership.agencyId });
  }

  async incomingForAgency(agencyId: string) {
    const dealers = await this.prisma.builderNetworkDealer.findMany({ where: { agencyId } });
    const cards = [];
    for (const dealer of dealers) {
      const ws = await this.mutate(dealer.organizationId, undefined, { type: 'sweep_timeouts' });
      const profile = ws.dealers.find((item) => item.id === dealer.id);
      if (!profile) continue;
      cards.push(...dealerLeadViews(ws, profile).map((view) => ({ ...view, organizationId: dealer.organizationId })));
    }
    return cards;
  }

  async askBuilder(agencyId: string, assignmentId: string, note: string) {
    const assignment = await this.prisma.builderAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw this.fail(new BuilderRuleError('Assignment not found.', 'not_found'));
    const dealer = await this.prisma.builderNetworkDealer.findFirst({ where: { id: assignment.dealerId, organizationId: assignment.organizationId, agencyId } });
    if (!dealer) throw this.fail(new BuilderRuleError('This lead is not assigned to your agency.', 'forbidden'));
    return this.mutate(assignment.organizationId, undefined, { type: 'ask_builder', assignmentId, note, actorDealerId: dealer.id });
  }

  async respondAsDealer(agencyId: string, assignmentId: string, decision: 'accept' | 'decline', reason?: DeclineReason) {
    const assignment = await this.prisma.builderAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw this.fail(new BuilderRuleError('Assignment not found.', 'not_found'));
    const dealer = await this.prisma.builderNetworkDealer.findFirst({ where: { id: assignment.dealerId, organizationId: assignment.organizationId, agencyId } });
    if (!dealer) throw this.fail(new BuilderRuleError('This lead is not assigned to your agency.', 'forbidden'));
    const action: BuilderAction = decision === 'accept'
      ? { type: 'respond_assignment', assignmentId, decision: 'accept', actorDealerId: dealer.id }
      : { type: 'respond_assignment', assignmentId, decision: 'decline', reason, actorDealerId: dealer.id };
    if (decision === 'decline' && !reason) throw this.fail(new BuilderRuleError('Choose a decline reason.'));
    return this.mutate(assignment.organizationId, undefined, action);
  }

  private async mutate(organizationId: string, accountId: string | undefined, action: BuilderAction): Promise<BuilderWorkspace> {
    try {
      let nextAction = action;
      if (action.type === 'transition_tour' && action.to === 'queued') {
        const provider = createBuilderReconstructionProvider();
        if (!provider.configured) {
          throw new BuilderRuleError('No reconstruction provider is configured. The upload stays stored and is not sent for processing.', 'provider_not_configured');
        }
        const current = await withOrganization(this.prisma, organizationId, accountId, (tx) => loadBuilderWorkspace(tx, organizationId));
        const tour = current.tours.find((item) => item.id === action.id);
        if (!tour) throw new BuilderRuleError('3D tour not found.', 'not_found');
        const ref = await provider.createJob({
          jobId: tour.id,
          organizationId,
          projectId: tour.projectId,
          unitId: tour.unitId,
          mode: tour.source,
          objectKeys: [],
        });
        nextAction = { ...action, providerJobRef: ref.providerJobRef, progress: null };
      }
      return await withOrganization(this.prisma, organizationId, accountId, async (tx) => {
        const current = await loadBuilderWorkspace(tx, organizationId);
        const previous = new Set(current.timeline.map((event) => event.id));
        const next = applyBuilderAction(current, nextAction, { now: new Date(), id: () => randomUUID() });
        const sweepIdle = nextAction.type === 'sweep_timeouts' && next.timeline.length === current.timeline.length;
        if (!sweepIdle) await saveBuilderWorkspace(tx, next, accountId, previous);
        next.reconstructionConfigured = createBuilderReconstructionProvider().configured;
        return next;
      });
    } catch (error) {
      throw this.fail(error);
    }
  }

  private pageArgs(page?: number, pageSize?: number) {
    const index = page ?? 0;
    const size = pageSize ?? 20;
    if (!Number.isInteger(index) || index < 0) throw this.fail(new BuilderRuleError('Page must be a non-negative integer.'));
    if (!Number.isInteger(size) || size < 1 || size > 50) throw this.fail(new BuilderRuleError('Page size must be between 1 and 50.'));
    return { page: index, pageSize: size };
  }

  private fail(error: unknown): HttpException | Error {
    if (error instanceof BuilderRuleError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : error.code === 'conflict' || error.code === 'provider_not_configured' ? 409 : 400;
      return new HttpException({ message: error.message, code: error.code }, status);
    }
    return error instanceof Error ? error : new Error('Builder action failed');
  }
}
