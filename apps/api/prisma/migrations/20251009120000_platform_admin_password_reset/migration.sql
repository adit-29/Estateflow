-- Expand-only: nullable reset columns and a boolean with a safe default.

ALTER TABLE "Account" ADD COLUMN "platformAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LocalAuthCredential" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "LocalAuthCredential" ADD COLUMN "resetExpiresAt" TIMESTAMP(3);
