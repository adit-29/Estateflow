-- Messaging models for the unified inbox. Tokens stay outside this schema.

CREATE TYPE "MessagingChannel" AS ENUM ('whatsapp', 'instagram', 'facebook_messenger');
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "ChannelConnectionState" AS ENUM ('not_connected', 'setup_required', 'connected', 'error');

CREATE TABLE "ChannelConnection" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "state" "ChannelConnectionState" NOT NULL DEFAULT 'not_connected',
    "displayName" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "secretRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "connectionId" UUID,
    "channel" "MessagingChannel" NOT NULL,
    "externalId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "leadId" UUID,
    "optOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "providerMessageId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "senderLabel" TEXT,
    "text" TEXT NOT NULL,
    "deliveryStatus" TEXT,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageAttachment" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "agencyId" UUID,
    "channel" "MessagingChannel" NOT NULL,
    "providerEventKey" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationAssignment" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationPreference" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowUpReminder" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUpReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChannelConnection_agencyId_idx" ON "ChannelConnection"("agencyId");
CREATE UNIQUE INDEX "ChannelConnection_agencyId_channel_key" ON "ChannelConnection"("agencyId", "channel");
CREATE INDEX "Conversation_agencyId_updatedAt_idx" ON "Conversation"("agencyId", "updatedAt");
CREATE UNIQUE INDEX "Conversation_agencyId_channel_externalId_key" ON "Conversation"("agencyId", "channel", "externalId");
CREATE INDEX "Message_conversationId_eventAt_idx" ON "Message"("conversationId", "eventAt");
CREATE UNIQUE INDEX "Message_agencyId_providerMessageId_key" ON "Message"("agencyId", "providerMessageId");
CREATE INDEX "MessageAttachment_agencyId_messageId_idx" ON "MessageAttachment"("agencyId", "messageId");
CREATE UNIQUE INDEX "WebhookEvent_providerEventKey_key" ON "WebhookEvent"("providerEventKey");
CREATE INDEX "WebhookEvent_channel_processedAt_idx" ON "WebhookEvent"("channel", "processedAt");
CREATE INDEX "ConversationAssignment_agencyId_conversationId_idx" ON "ConversationAssignment"("agencyId", "conversationId");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConversationAssignment" ADD CONSTRAINT "ConversationAssignment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunicationPreference" ADD CONSTRAINT "CommunicationPreference_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpReminder" ADD CONSTRAINT "FollowUpReminder_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
