CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[] NOT NULL,
    "allowedScopes" TEXT[] NOT NULL DEFAULT ARRAY['openid', 'profile', 'email', 'hydroline']::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthClientGrant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OAuthClientGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthAuthorizationCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "nonce" TEXT,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");
CREATE INDEX "OAuthClient_enabled_idx" ON "OAuthClient"("enabled");
CREATE UNIQUE INDEX "OAuthClientGrant_clientId_userId_key" ON "OAuthClientGrant"("clientId", "userId");
CREATE INDEX "OAuthClientGrant_userId_idx" ON "OAuthClientGrant"("userId");
CREATE UNIQUE INDEX "OAuthAuthorizationCode_codeHash_key" ON "OAuthAuthorizationCode"("codeHash");
CREATE INDEX "OAuthAuthorizationCode_clientId_expiresAt_idx" ON "OAuthAuthorizationCode"("clientId", "expiresAt");
CREATE INDEX "OAuthAuthorizationCode_userId_idx" ON "OAuthAuthorizationCode"("userId");
CREATE INDEX "OAuthAuthorizationCode_expiresAt_idx" ON "OAuthAuthorizationCode"("expiresAt");

ALTER TABLE "OAuthClientGrant" ADD CONSTRAINT "OAuthClientGrant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthClientGrant" ADD CONSTRAINT "OAuthClientGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
