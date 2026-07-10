-- Add a business-fact dedupe key for future identity evidence.
-- Existing rows stay untouched with evidenceHash = NULL.
ALTER TABLE "ServerPlayerIdentityEvidence"
ADD COLUMN "evidenceHash" TEXT;

CREATE UNIQUE INDEX "ServerPlayerIdentityEvidence_source_serverId_uuid_evidenceHash_key"
ON "ServerPlayerIdentityEvidence"("source", "serverId", "uuid", "evidenceHash");
