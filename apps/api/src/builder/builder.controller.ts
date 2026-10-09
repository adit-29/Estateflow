import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AccessPermission, AssignmentMode, BuilderAction, DeclineReason, LeadInput, MediaInput, NotificationPrefs, ProjectInput, TourInput } from '@estateflow/shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AgencyGuard } from '../dealer/agency.guard';
import { BuilderGuard } from './builder.guard';
import { BuilderService } from './builder.service';

@Controller(['builder', 'api/builder'])
@UseGuards(AuthGuard, BuilderGuard)
export class BuilderController {
  constructor(private readonly builder: BuilderService) {}

  @Get('workspace')
  workspace(@Req() req: AuthenticatedRequest) {
    return this.builder.workspace(req.organizationId!, req.user!.id);
  }

  @Post('actions')
  apply(@Req() req: AuthenticatedRequest, @Body() body: BuilderAction) {
    return this.builder.apply(req.organizationId!, req.user!.id, body);
  }

  @Post('leads')
  createLead(@Req() req: AuthenticatedRequest, @Body() body: LeadInput) {
    return this.builder.createLead(req.organizationId!, req.user!.id, body);
  }

  @Post('media/upload-intent')
  uploadIntent(@Req() req: AuthenticatedRequest, @Body() body: { projectId: string; contentType: string; size: number }) {
    return this.builder.uploadIntent(req.organizationId!, body);
  }

  @Get('media/:id/url')
  viewUrl(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.viewUrl(req.organizationId!, req.user!.id, id);
  }

  @Post('dealers/:id/link')
  linkDealer(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { email: string }) {
    return this.builder.linkDealer(req.organizationId!, req.user!.id, id, body.email ?? '');
  }

  @Get('projects')
  listProjects(@Req() req: AuthenticatedRequest, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.builder.listProjects(req.organizationId!, req.user!.id, intQuery(page), intQuery(pageSize));
  }

  @Post('projects')
  createProject(@Req() req: AuthenticatedRequest, @Body() body: ProjectInput) {
    return this.builder.createProject(req.organizationId!, req.user!.id, body);
  }

  @Get('projects/:id')
  getProject(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.getProject(req.organizationId!, req.user!.id, id);
  }

  @Patch('projects/:id')
  patchProject(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: Partial<ProjectInput>) {
    return this.builder.patchProject(req.organizationId!, req.user!.id, id, body ?? {});
  }

  @Post('projects/:id/media')
  addMedia(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: Omit<MediaInput, 'projectId'>) {
    return this.builder.addMedia(req.organizationId!, req.user!.id, id, body);
  }

  @Delete('media/:id')
  deleteMedia(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.deleteMedia(req.organizationId!, req.user!.id, id);
  }

  @Post('3d-tours/jobs')
  createTour(@Req() req: AuthenticatedRequest, @Body() body: TourInput) {
    return this.builder.createTourJob(req.organizationId!, req.user!.id, body);
  }

  @Get('3d-tours/jobs/:id')
  getTour(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.getTourJob(req.organizationId!, req.user!.id, id);
  }

  @Post('3d-tours/jobs/:id/approve')
  approveTour(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.transitionTour(req.organizationId!, req.user!.id, id, 'approved');
  }

  @Post('3d-tours/jobs/:id/publish')
  publishTour(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.transitionTour(req.organizationId!, req.user!.id, id, 'published');
  }

  @Post('3d-tours/jobs/:id/retry')
  retryTour(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.transitionTour(req.organizationId!, req.user!.id, id, 'queued');
  }

  @Get('dealers')
  listDealers(@Req() req: AuthenticatedRequest, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.builder.listDealers(req.organizationId!, req.user!.id, intQuery(page), intQuery(pageSize));
  }

  @Post('dealers/:id/access')
  grantAccess(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { projectId: string; permissions: AccessPermission[]; expiresAt?: string | null }) {
    return this.builder.grantAccess(req.organizationId!, req.user!.id, id, body);
  }

  @Delete('dealers/:id/access/:accessId')
  revokeAccess(@Req() req: AuthenticatedRequest, @Param('accessId') accessId: string) {
    return this.builder.revokeAccess(req.organizationId!, req.user!.id, accessId);
  }

  @Get('leads')
  listLeads(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('projectId') projectId?: string,
    @Query('stage') stage?: string,
    @Query('dealerId') dealerId?: string,
  ) {
    return this.builder.listLeads(req.organizationId!, req.user!.id, { page: intQuery(page), pageSize: intQuery(pageSize), projectId, stage, dealerId });
  }

  @Post('leads/:id/recommendations')
  recommendations(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.builder.recommendations(req.organizationId!, req.user!.id, id);
  }

  @Post('leads/:id/assign')
  assign(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { mode?: AssignmentMode; dealerId?: string }) {
    return this.builder.assignLead(req.organizationId!, req.user!.id, id, body ?? {});
  }

  @Post('leads/:id/reassign')
  reassign(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { dealerId: string }) {
    return this.builder.assignLead(req.organizationId!, req.user!.id, id, { mode: 'manual', dealerId: body?.dealerId });
  }

  @Get('analytics')
  analytics(@Req() req: AuthenticatedRequest, @Query('projectId') projectId?: string) {
    return this.builder.analytics(req.organizationId!, req.user!.id, projectId);
  }

  @Get('assignment-rules')
  rules(@Req() req: AuthenticatedRequest) {
    return this.builder.assignmentRules(req.organizationId!, req.user!.id);
  }

  @Patch('assignment-rules')
  patchRules(@Req() req: AuthenticatedRequest, @Body() body: { mode?: AssignmentMode; responseWindowMinutes?: number; maxReassignments?: number; notifications?: Partial<NotificationPrefs> }) {
    return this.builder.patchAssignmentRules(req.organizationId!, req.user!.id, body ?? {});
  }

  @Get('quality')
  quality(@Req() req: AuthenticatedRequest) {
    return this.builder.quality(req.organizationId!, req.user!.id);
  }

  @Get('audit')
  audit(@Req() req: AuthenticatedRequest, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.builder.audit(req.organizationId!, req.user!.id, intQuery(page), intQuery(pageSize));
  }

  @Post('copilot')
  copilot(@Req() req: AuthenticatedRequest, @Body() body: { question?: string }) {
    return this.builder.copilot(req.organizationId!, req.user!.id, body?.question ?? '');
  }
}

function intQuery(value: string | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

@Controller('dealer/builder-leads')
@UseGuards(AuthGuard, AgencyGuard)
export class BuilderIncomingController {
  constructor(private readonly builder: BuilderService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.builder.incomingForAgency(req.agencyId!);
  }

  @Post(':assignmentId/ask')
  ask(@Req() req: AuthenticatedRequest, @Param('assignmentId') assignmentId: string, @Body() body: { note: string }) {
    return this.builder.askBuilder(req.agencyId!, assignmentId, body.note ?? '');
  }

  @Post(':assignmentId/respond')
  respond(
    @Req() req: AuthenticatedRequest,
    @Param('assignmentId') assignmentId: string,
    @Body() body: { decision: 'accept' | 'decline'; reason?: DeclineReason },
  ) {
    return this.builder.respondAsDealer(req.agencyId!, assignmentId, body.decision, body.reason);
  }
}
