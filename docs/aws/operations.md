# Operations

## Backups and restore

RDS automated backups keep 7 days outside production and 14 days in the production example. Production also sets deletion protection and a final snapshot name.

Restore rehearsal, in a non-production account:

1. Restore a snapshot to a new instance in the private subnets.
2. Point a one-off task at that instance with a Secrets Manager URL.
3. Run `SELECT count(*)` for one known agency and confirm another agency’s id is absent when RLS is active.
4. Delete the restored instance when the check is done.

`prisma migrate deploy` is the schema path. Do not use `migrate dev` against RDS.

## Rollback

ECS keeps the previous task definition, and the deployment circuit breaker rolls back automatically when new tasks fail health checks. To roll back by hand, update the service to the last good revision and wait until the new tasks are healthy. Migration rollback is covered in `deployment.md` under "Migrations and rollback". Migrations never run on container startup.

## Rate limits, monitoring, incident response

The API throttles auth, uploads, share-link creation, and public share views (30 per minute).

These alarms publish to the SNS topic. Confirm the email subscription, or they are silent.

| Alarm | Threshold |
| --- | --- |
| ALB 5xx | Above 5 in five minutes |
| Unhealthy targets | Any unhealthy API or web target |
| RDS CPU | Above 80 percent for two periods |
| RDS free storage | Low free storage |
| `unhandled_error` | Any such log line |
| DLQ | Messages in the DLQ, when the queue is enabled |

Every log line is JSON with `level`, `event`, `ts`, and `requestId`. The API returns the request id in `x-request-id`. Useful CloudWatch Logs Insights query:

```
fields ts, level, event, requestId, method, path, status, message | filter level = "error" | sort ts desc
```

Incident response, in order:

1. Get the request id from the user or from the response header.
2. Find its lines in the API log group.
3. Check `/health/ready`, and RDS connections and CPU.
4. Decide whether to roll back the task definition or restore a snapshot.

Customer messages should say the service is unavailable. Do not paste tokens or row contents into the ticket.

To send errors to an external tracker later, call `setErrorReporter()` in `main.ts` with an adapter. No vendor is wired.

## Retention and privacy

Reconstruction retention defaults to `RECONSTRUCTION_RETENTION_DAYS` (30). That field is stored on the job. A deletion worker is not running yet, so the timestamp is policy, not enforcement.

Tour videos show private homes:

- Upload requires an explicit ownership and consent checkbox. The consent time and the account that gave it are stored.
- Objects live only in the private bucket. Viewing goes through 10-minute signed URLs.
- Share links expose only the property title and locality, and can be revoked.
- Detaching a tour revokes its links.

Account deletion should remove or anonymise leads, messages, and media for that agency after a confirmed export. Demo browser storage is cleared with Settings → Reset demo data and is not the production record.

## Uploads and malware scanning

The API rejects tour videos that:

- are not MP4, MOV, or WebM,
- exceed `RECONSTRUCTION_MAX_BYTES`,
- are shorter than 20 seconds or longer than 30 minutes, or
- come without consent.

Uploads go straight from the browser to the private bucket, using a 15-minute presigned PUT that signs the content type and length. The browser never receives an AWS key. After the upload, the API checks the stored object's size and type, and marks the job failed on a mismatch.

Scanning design, not built:

1. After upload, an SQS message asks a scanner task to read the object.
2. Infected objects are tagged and deleted, and the job fails.
3. A job would not be sent to a provider or viewed until its scan is clean.

No scanner vendor is configured.

## Authentication notes

Production auth is Amazon Cognito. The provider class still refuses requests, and the API refuses to start in production with any other provider. So production cannot run until the Cognito adapter is written and tested.

Browser sessions use the httpOnly `ef_session` cookie: `SameSite=Lax`, and `Secure` outside local. API clients may send `Authorization: Bearer`. No session token is stored in `localStorage`. Lax blocks cross-site POSTs. A CSRF token or Origin check is still a recommended hardening step before production. `trust proxy` is set so the app sees HTTPS from the load balancer.

Input validation uses Zod on shared contracts and explicit checks on uploads. API errors returned to clients are status text, not stack traces. React escapes text in the UI.

## Dependency scanning

CI runs `npm audit --audit-level=high`. It does not fail the workflow on moderate findings. Review high and critical results before a release. There is no third-party scanner account in this repo.

## Cost assumptions

Rough monthly list price in `REPLACE_REGION`, one environment, excluding tax and data transfer:

| Piece | Dev assumption |
| --- | --- |
| NAT gateway | About 32 USD plus data processed. This is usually the largest fixed cost. |
| Fargate, two tasks at 0.25 vCPU and 0.5 GB | About 15–25 USD |
| RDS `db.t4g.micro`, 20 GB | About 15 USD. Not a production size. |
| ALB | About 20 USD plus LCU |
| Secrets Manager: three secrets | About 1.20 USD |
| Logs, S3, KMS for the alarm topic | A few USD at low volume. Tour videos grow S3 storage by roughly 0.023 USD per GB-month |
| SQS | Zero unless `enable_job_queue = true`, and then near zero at low volume |
| Cognito | Low at small monthly active users |
| ECR | About 0.10 USD per GB stored. Add a lifecycle rule for old tags |
| Reconstruction vendor | Per-job pricing, not chosen yet |

Staging is similar, with a larger database class. Production examples use two tasks, Multi-AZ, and `db.t4g.medium`, which is several times the dev database cost. Container Insights is on in production and adds CloudWatch metric charges. Re-price in the AWS calculator before apply. These are assumptions, not a quote.

Cost checklist before apply:

- [ ] Priced in the AWS calculator for the target region.
- [ ] An AWS Budgets alert is set on the account. This is a manual step and is not in Terraform.
- [ ] One NAT gateway, not one per AZ, is acceptable for this environment.
- [ ] The database class and Multi-AZ setting match the environment.
- [ ] `enable_job_queue` stays false until a worker exists.

## Teardown for non-production

Only after approval, and only for dev or staging:

1. Scale the `api` and `web` services to 0, or skip straight to destroy.
2. Take a final RDS snapshot if you still need the data.
3. Empty the media bucket, including all versions, or destroy fails.
4. Delete ECR images if the repositories are going too. They are not in this stack.
5. Run the plan, then destroy with approval:

   ```bash
   cd infra/terraform
   terraform plan -destroy -var-file=envs/staging.tfvars
   # terraform destroy -var-file=envs/staging.tfvars   # only with explicit approval
   ```

6. Secrets Manager secrets enter a 7-day recovery window before deletion (30 in production), so the same names can't be reused until that window ends. Use `aws secretsmanager delete-secret --force-delete-without-recovery` only for non-production secrets.
7. Remove the DNS records and, if unused, the ACM certificate.
8. Delete the state bucket and lock table last, by hand. Destroy does not touch them.

Production has deletion protection on RDS and Cognito. Turn it off in a reviewed change before any destroy.

## What would justify more infrastructure later

- **Kubernetes:** many services, custom schedulers, or a platform team. Two Fargate services do not need it.
- **Kafka:** a durable ordered log for high event volume or several independent consumers. SQS is enough for job retries and a dead-letter queue.
- **OpenSearch:** full-text ranking, faceted search, or log analytics beyond PostgreSQL. Current search is PostgreSQL full text.
- **Redis:** a measured cache or shared rate-limit store after connection or latency data shows Postgres or in-memory limits are the bottleneck. Do not add it for sessions while auth is Cognito.
