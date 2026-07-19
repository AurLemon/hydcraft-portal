CREATE TABLE "OAuthAccessToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthAccessToken_tokenHash_key" ON "OAuthAccessToken"("tokenHash");
CREATE INDEX "OAuthAccessToken_clientId_expiresAt_idx" ON "OAuthAccessToken"("clientId", "expiresAt");
CREATE INDEX "OAuthAccessToken_userId_idx" ON "OAuthAccessToken"("userId");
CREATE INDEX "OAuthAccessToken_expiresAt_idx" ON "OAuthAccessToken"("expiresAt");
CREATE INDEX "OAuthAccessToken_revokedAt_idx" ON "OAuthAccessToken"("revokedAt");

ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthClient" ALTER COLUMN "allowedScopes" SET DEFAULT ARRAY['profile', 'email', 'hydroline']::TEXT[];
