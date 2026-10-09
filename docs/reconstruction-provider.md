# 3D reconstruction provider: decision record

Status: **open**. No vendor is selected and no vendor adapter ships in this build.

This is a separate integration task. It should not be done inside a UI change.

## What exists today

- **Private upload pipeline.** A dealer picks one of their properties, selects a video, and adds capture notes.
  - The browser checks type, size, and duration. The server checks type, size, and consent again.
  - The API creates a `ReconstructionJob` (`draft`) and returns a 15-minute presigned S3 PUT. The job moves to `uploading`.
  - The browser uploads directly to the private bucket.
  - `POST /reconstruction/jobs/:id/complete` calls `HeadObject` and checks the stored size and type before accepting the upload.
- **State machine.** Defined in `packages/shared/src/tour-job.ts`:
  - `draft → uploading → video_uploaded | queued → processing → ready | needs_more_footage | failed`.
  - Every transition is a conditional update on the current status, so racing callbacks cannot skip a state.
- **Provider interface.** `TourReconstructionProvider.submit({ jobId, videoKey, captureNotes }) → { providerJobRef }` in `apps/api/src/reconstruction/tour-provider.ts`.
  - With no provider configured, the job stops at `video_uploaded` with the message "not sent for processing".
  - With a provider named but no adapter written, submission fails with `provider_adapter_not_implemented`. Nothing is sent.
- **Callback contract.** `POST /reconstruction/callbacks/:provider`.
  - The body is HMAC-SHA256 signed with `RECONSTRUCTION_WEBHOOK_SECRET` in `x-estateflow-signature: sha256=<hex>`.
  - Payload: `{ providerJobRef, status: processing|ready|needs_more_footage|failed, progress?, modelKey?, message? }`. The schema is strict.
  - A `ready` callback must name a `.glb` or `.gltf` object under `agencies/<agencyId>/tours/<jobId>/`, and that object must exist in the bucket.
- **Viewer.**
  - Ready jobs use `<model-viewer>` with a 10-minute presigned GET.
  - If the model is missing or fails to load, the viewer falls back to the original walkthrough video.
- **Sharing.**
  - A dealer can share a Ready tour only after attaching it to its property.
  - Share links carry a 192-bit token. Only its SHA-256 hash is stored.
  - Links expire after 1–30 days and can be revoked. Detaching a tour revokes all of its links.
  - The public page shows only the property title and locality.

## What the vendor task must decide

| Question | Why it matters |
| --- | --- |
| Input: phone walkthrough video, or does the vendor need its own capture app or LiDAR? | Plain video → mesh quality varies. Some products only accept their own capture. |
| Output format | The viewer needs glTF/GLB. A vendor that returns only a hosted iframe needs a different viewer and a different privacy review. |
| Where results live | Preferred: the vendor writes into our bucket under the job prefix, or we copy it there. Hosting on the vendor's CDN makes the tour public unless they sign URLs. |
| Data processing terms | Videos show private homes. Confirm retention, deletion on request, sub-processors, and region (India data residency if required). |
| Cost per job and failure billing | Sets the free and paid tiers and whether `needs_more_footage` is charged. |
| Callback or polling | The contract above assumes callbacks. For polling, add a worker. SQS is in Terraform behind `enable_job_queue`, but no worker exists yet. |
| Latency | Minutes versus hours changes the dealer copy and the notification design. |

Candidates to evaluate: photogrammetry and Gaussian-splat APIs, and commercial virtual-tour vendors. No vendor has been contacted and no claims about any of them are made here.

## Implementation checklist, once a vendor is chosen

1. Write `XyzReconstructionProvider implements TourReconstructionProvider`:
   - Submit a presigned GET of the source video, or copy the object.
   - Store `providerJobRef`.
   - Map vendor errors to `ProviderSubmitError(category)`.
2. Translate vendor webhooks into the callback contract. Either do this in a thin adapter route that verifies the vendor's own signature, or have the vendor call the generic route.
3. Copy the result into `agencies/<agencyId>/tours/<jobId>/model.glb` before sending `ready`.
4. Add a contract test that uses recorded vendor payloads.
5. Set `RECONSTRUCTION_PROVIDER`, `RECONSTRUCTION_API_KEY`, and `RECONSTRUCTION_WEBHOOK_SECRET` in the `estateflow/<env>/app` secret, plus `RECONSTRUCTION_PROVIDER` in `api_config`.
6. Only after a real job completes in staging, change the provider label from "Configured · adapter not implemented" to a verified state.

Builder tours use a separate state machine (`packages/shared/src/builder-portal.ts`): uploaded, queued, processing, ready for review, approved, then published. `createBuilderReconstructionProvider` never returns the demo mock. A named provider with no adapter is not called. The builder demo scene is the existing illustrative viewer and is labelled as such.

## Not built

- Retention deletion: `retentionUntil` is recorded, but no job deletes objects.
- Malware scanning of uploads.
- Resumable or multipart uploads. A single PUT is limited by `RECONSTRUCTION_MAX_BYTES` (500 MB default).
- Job cancellation.
