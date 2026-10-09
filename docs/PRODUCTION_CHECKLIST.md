# Production checklist

This is an operator list. Completing it does **not** make the product legally compliant or security-certified.

## Blockers (do not go live)

- [ ] Cognito adapter implemented, reviewed, and tested. Production currently **cannot sign anyone in**.
- [ ] Explicit approval to create AWS resources and to run `terraform apply`.
- [ ] `AUTH_PROVIDER=cognito` and Cognito env values in Secrets Manager.
- [ ] `DATABASE_URL` with `sslmode=require`.
- [ ] `CORS_ORIGIN` is the real HTTPS web origin.
- [ ] Web image built with `NEXT_PUBLIC_APP_ENV=production` and the production `API_URL`.
- [ ] `SEED_DEMO_DATA` unset/false.
- [ ] No `AWS_ACCESS_KEY_ID` on tasks.

## Before first deploy

- [ ] Staging environment passing `docs/aws/deployment.md` smoke test.
- [ ] RDS backups on; restore rehearsed in a non-prod account.
- [ ] Alarm email subscription confirmed.
- [ ] Platform admin granted only to named operators (`Account.platformAdmin`).
- [ ] Secrets rotated if they were ever pasted into chat.
- [ ] `npm audit` high/critical reviewed (CI currently continues on audit failure).
- [ ] Buyer/seller/tenant live accounts **not** advertised as production CRM (API still dealer|builder only).

## After deploy

- [ ] `/health` and `/health/ready` 200.
- [ ] Cross-agency lead/property ids return 404.
- [ ] Cookie POST from a foreign Origin returns `CSRF_ORIGIN`.
- [ ] Copilot on a live account does not invent leads or commissions.
- [ ] Demo workspace is absent from the production web bundle.
- [ ] Previous task definition revision recorded for rollback.

## Remaining product gaps (honest)

- Live buyer, seller, and tenant APIs are not enabled.
- Email/SMS delivery of verify and reset codes is not implemented.
- Property media is a URL list, not a validated object-storage upload (except tour jobs).
- RLS is not forced for the table owner; tenant isolation is application filters.
- Builder Copilot is demo Q&A, not live tools.
- 3D reconstruction vendor adapter is not implemented.
