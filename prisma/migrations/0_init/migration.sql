-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DELETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AttachmentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MEMBER', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED', 'BANNED');

-- CreateEnum
CREATE TYPE "UserProfileLanguage" AS ENUM ('ZH_CN', 'ZH_TW', 'EN_US', 'JA_JP');

-- CreateEnum
CREATE TYPE "UserGender" AS ENUM ('UNSPECIFIED', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "TimezoneMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "MinecraftServerSnapshotKind" AS ENUM ('SERVER_INFO', 'SERVER_STATUS', 'WORLDS', 'ONLINE_PLAYERS', 'METRICS', 'HEARTBEAT', 'PLAYER_SNAPSHOT', 'PLAYERDATA_SCAN', 'STATS_SNAPSHOT', 'ADVANCEMENTS_SNAPSHOT', 'COMMAND_RESULT');

-- CreateEnum
CREATE TYPE "ServerPlayerIdentityConflictState" AS ENUM ('NONE', 'USERNAME_CONFLICT', 'UUID_CONFLICT', 'SOURCE_CONFLICT');

-- CreateEnum
CREATE TYPE "ServerPlayerIdentityEvidenceSource" AS ENUM ('PORTAL_BRIDGE', 'PLAYERDATA_SCAN', 'MANUAL', 'TEST');

-- CreateEnum
CREATE TYPE "PortalBridgeConnectionState" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "PortalBridgeCommandStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MinecraftAccountStatus" AS ENUM ('PENDING', 'VERIFIED', 'IMPORTED', 'UNLINKED', 'CONFLICTED');

-- CreateEnum
CREATE TYPE "MinecraftAccountSource" AS ENUM ('PORTAL', 'AUTHME', 'MANUAL', 'MIGRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MinecraftAccountBindingAction" AS ENUM ('VERIFICATION_PASSED', 'BIND_CREATED', 'BIND_REJECTED_ALREADY_BOUND', 'BIND_REJECTED_CURRENT_USER', 'PRIMARY_SET', 'UNBOUND', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "AuthRegistrationTicketKind" AS ENUM ('GAME_ACCOUNT', 'OAUTH');

-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('GITHUB', 'GOOGLE', 'MICROSOFT', 'QQ', 'DISCORD', 'MINECRAFT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UserEmailKind" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('VERIFY_EMAIL', 'CHANGE_PRIMARY_EMAIL', 'ADD_SECONDARY_EMAIL', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "AuthEmailCodePurpose" AS ENUM ('EMAIL_LOGIN', 'EMAIL_REGISTER');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_REVOKED', 'SESSIONS_REVOKED', 'EMAIL_VERIFICATION_SENT', 'EMAIL_VERIFIED', 'PRIMARY_EMAIL_CHANGED', 'SECONDARY_EMAIL_ADDED', 'SECONDARY_EMAIL_REMOVED', 'PASSWORD_CHANGED', 'OAUTH_LINKED', 'OAUTH_UNLINKED', 'MINECRAFT_ACCOUNT_BOUND');

-- CreateEnum
CREATE TYPE "UserActivityEventType" AS ENUM ('REGISTERED');

-- CreateEnum
CREATE TYPE "UserAuthActivitySource" AS ENUM ('LOGIN', 'REFRESH', 'AUTHENTICATED_REQUEST');

-- CreateEnum
CREATE TYPE "ExternalSyncSource" AS ENUM ('AUTHME', 'LUCKPERMS', 'PORTAL_BRIDGE_PLAYERS', 'PORTAL_BRIDGE_PLAYERDATA', 'PORTAL_BRIDGE_STATS', 'PORTAL_BRIDGE_ADVANCEMENTS');

-- CreateEnum
CREATE TYPE "ExternalSyncReason" AS ENUM ('STARTUP', 'SCHEDULED', 'MANUAL', 'SCRIPT', 'CONFIG_SAVED');

-- CreateEnum
CREATE TYPE "ExternalSyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PartnerKind" AS ENUM ('SERVER', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "PartnerSection" AS ENUM ('COMMUNITY', 'SUPPORT_ACKNOWLEDGEMENTS');

-- CreateEnum
CREATE TYPE "FriendLinkCategory" AS ENUM ('BUSINESS', 'PERSONAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "FriendLinkApplicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "category" TEXT,
    "purpose" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "visibility" "AttachmentVisibility" NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "bucketProfile" TEXT NOT NULL,
    "objectKey" TEXT,
    "originalKey" TEXT,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachmentVariant" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttachmentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthMeAccount" (
    "id" TEXT NOT NULL,
    "authmeId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "realname" TEXT,
    "normalizedUsername" TEXT NOT NULL,
    "email" TEXT,
    "registeredAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "registerIp" TEXT,
    "lastIp" TEXT,
    "hasTotp" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthMeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckPermsPlayer" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "username" TEXT,
    "normalizedUsername" TEXT,
    "primaryGroup" TEXT,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuckPermsPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckPermsGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuckPermsGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckPermsUserPermission" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "uuid" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "server" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "expiry" BIGINT NOT NULL,
    "contexts" TEXT NOT NULL,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuckPermsUserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckPermsGroupPermission" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "server" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "expiry" BIGINT NOT NULL,
    "contexts" TEXT NOT NULL,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuckPermsGroupPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckPermsAction" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "time" BIGINT NOT NULL,
    "actorUuid" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actedUuid" TEXT NOT NULL,
    "actedName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuckPermsAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckPermsTrack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groups" TEXT NOT NULL,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuckPermsTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuckPermsMessenger" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "raw" JSONB,
    "rawHash" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuckPermsMessenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSyncState" (
    "id" TEXT NOT NULL,
    "source" "ExternalSyncSource" NOT NULL,
    "reason" "ExternalSyncReason",
    "running" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 1800,
    "lastStartedAt" TIMESTAMP(3),
    "lastFinishedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsMatched" INTEGER NOT NULL DEFAULT 0,
    "rowsChanged" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSyncTaskState" (
    "id" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "source" "ExternalSyncSource" NOT NULL,
    "reason" "ExternalSyncReason",
    "running" BOOLEAN NOT NULL DEFAULT false,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 1800,
    "lastStartedAt" TIMESTAMP(3),
    "lastFinishedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsMatched" INTEGER NOT NULL DEFAULT 0,
    "rowsChanged" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSyncTaskState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendLink" (
    "id" TEXT NOT NULL,
    "category" "FriendLinkCategory" NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "avatarAttachmentId" TEXT,
    "avatarUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendLinkApplication" (
    "id" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "category" "FriendLinkCategory",
    "url" TEXT,
    "name" TEXT,
    "summary" TEXT,
    "avatarAttachmentId" TEXT,
    "avatarUrl" TEXT,
    "applicantStatement" TEXT,
    "status" "FriendLinkApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "approvedLinkId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendLinkApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "uuid" TEXT,
    "status" "MinecraftAccountStatus" NOT NULL DEFAULT 'PENDING',
    "source" "MinecraftAccountSource" NOT NULL DEFAULT 'PORTAL',
    "authmeName" TEXT,
    "authmeId" INTEGER,
    "firstJoinedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "unlinkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinecraftAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftAccountBindingHistory" (
    "id" TEXT NOT NULL,
    "minecraftAccountId" TEXT NOT NULL,
    "action" "MinecraftAccountBindingAction" NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "previousUserId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinecraftAccountBindingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftServer" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 25565,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinecraftServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalBridgeConfig" (
    "id" TEXT NOT NULL,
    "minecraftServerId" TEXT NOT NULL,
    "bridgeId" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'portalbridge-core',
    "wsUrl" TEXT NOT NULL,
    "encryptedSecret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requestedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coreSyncIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "streamEpoch" TEXT,
    "resumeFromSeq" BIGINT NOT NULL DEFAULT 0,
    "lastConnectionState" "PortalBridgeConnectionState" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "lastDisconnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalBridgeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftServerSnapshot" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "kind" "MinecraftServerSnapshotKind" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinecraftServerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerPlayerIdentity" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "username" TEXT,
    "normalizedUsername" TEXT,
    "uuidSource" TEXT,
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "conflictState" "ServerPlayerIdentityConflictState" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerPlayerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerPlayerIdentityEvidence" (
    "id" TEXT NOT NULL,
    "source" "ServerPlayerIdentityEvidenceSource" NOT NULL,
    "sourceMessageId" TEXT,
    "serverId" TEXT NOT NULL,
    "uuid" TEXT,
    "username" TEXT,
    "normalizedUsername" TEXT,
    "uuidSource" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerPlayerIdentityEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerPlayerSession" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "sessionId" TEXT,
    "uuid" TEXT NOT NULL,
    "username" TEXT,
    "normalizedUsername" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerPlayerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftServerPlayer" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "username" TEXT,
    "normalizedUsername" TEXT,
    "uuidSource" TEXT,
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "conflictState" "ServerPlayerIdentityConflictState" NOT NULL DEFAULT 'NONE',
    "portalAccountId" TEXT,
    "portalUserId" TEXT,
    "portalAccountStatus" "MinecraftAccountStatus",
    "portalAccountSource" "MinecraftAccountSource",
    "online" BOOLEAN NOT NULL DEFAULT false,
    "lastOnlineAt" TIMESTAMP(3),
    "lastOfflineAt" TIMESTAMP(3),
    "lastOnlineWorldName" TEXT,
    "lastOnlineDimension" TEXT,
    "lastOnlineX" DOUBLE PRECISION,
    "lastOnlineY" DOUBLE PRECISION,
    "lastOnlineZ" DOUBLE PRECISION,
    "bridgeSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinecraftServerPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftServerPlayerData" (
    "id" TEXT NOT NULL,
    "minecraftServerPlayerId" TEXT NOT NULL,
    "playerDataFile" TEXT,
    "lastModifiedAt" TIMESTAMP(3),
    "hasStatsFile" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvancementsFile" BOOLEAN NOT NULL DEFAULT false,
    "lastKnownName" TEXT,
    "firstPlayedAt" TIMESTAMP(3),
    "lastPlayedAt" TIMESTAMP(3),
    "lastWorldName" TEXT,
    "lastDimension" TEXT,
    "lastX" DOUBLE PRECISION,
    "lastY" DOUBLE PRECISION,
    "lastZ" DOUBLE PRECISION,
    "lastYaw" DOUBLE PRECISION,
    "lastPitch" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinecraftServerPlayerData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftServerPlayerStatsSnapshot" (
    "id" TEXT NOT NULL,
    "minecraftServerPlayerId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "statsHash" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "lastScannedAt" TIMESTAMP(3),
    "stats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinecraftServerPlayerStatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftServerPlayerAdvancementsSnapshot" (
    "id" TEXT NOT NULL,
    "minecraftServerPlayerId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "advancementsHash" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "lastScannedAt" TIMESTAMP(3),
    "advancements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinecraftServerPlayerAdvancementsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAdvancementUnlockEvent" (
    "id" TEXT NOT NULL,
    "minecraftServerPlayerId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "advancementKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAdvancementUnlockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalBridgeMessageReceipt" (
    "id" TEXT NOT NULL,
    "bridgeConfigId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "streamEpoch" TEXT,
    "seq" BIGINT,
    "topic" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackedAt" TIMESTAMP(3),
    "payload" JSONB,

    CONSTRAINT "PortalBridgeMessageReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalBridgeCommand" (
    "id" TEXT NOT NULL,
    "bridgeConfigId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "PortalBridgeCommandStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalBridgeCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" "PartnerSection" NOT NULL DEFAULT 'COMMUNITY',
    "kind" "PartnerKind",
    "summary" TEXT,
    "websiteUrl" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "avatarAttachmentId" TEXT,
    "coverAttachmentId" TEXT,
    "linkedMinecraftServerId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "relationshipEstablishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEditor" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEditor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCoreMember" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCoreMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameChangedAt" TIMESTAMP(3),
    "hydrolineId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "avatarAttachmentId" TEXT,
    "coverAttachmentId" TEXT,
    "bio" TEXT,
    "schoolOrCompany" TEXT,
    "occupationOrMajor" TEXT,
    "location" TEXT,
    "countryOrRegion" TEXT,
    "gender" "UserGender" NOT NULL DEFAULT 'UNSPECIFIED',
    "birthday" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedTextZhCn" TEXT,
    "verifiedTextZhTw" TEXT,
    "verifiedTextEnUs" TEXT,
    "verifiedTextJaJp" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastAuthActivityAt" TIMESTAMP(3),
    "lastAuthActivitySource" "UserAuthActivitySource",
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserActivityEventType" NOT NULL,
    "detail" TEXT,
    "serverName" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "h2wikiPageName" TEXT,
    "githubUsername" TEXT,
    "websiteUrl" TEXT,
    "bilibiliUrl" TEXT,
    "qqNumber" TEXT,
    "wechatId" TEXT,
    "publicEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfilePreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" "UserProfileLanguage" NOT NULL DEFAULT 'ZH_CN',
    "timezoneMode" "TimezoneMode" NOT NULL DEFAULT 'AUTO',
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfilePreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfilePrivacy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicProfile" BOOLEAN NOT NULL DEFAULT true,
    "showHydrolineId" BOOLEAN NOT NULL DEFAULT true,
    "showJoinedAt" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showCountryOrRegion" BOOLEAN NOT NULL DEFAULT true,
    "showBirthday" BOOLEAN NOT NULL DEFAULT true,
    "showBadges" BOOLEAN NOT NULL DEFAULT true,
    "showBio" BOOLEAN NOT NULL DEFAULT true,
    "showMinecraftProfileLink" BOOLEAN NOT NULL DEFAULT true,
    "showSocialLinks" BOOLEAN NOT NULL DEFAULT true,
    "showActivityStatus" BOOLEAN NOT NULL DEFAULT true,
    "searchableInUserDirectory" BOOLEAN NOT NULL DEFAULT true,
    "allowMinecraftProfileDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfilePrivacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfileBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT,
    "label" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfileBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileBadge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelZhCn" TEXT NOT NULL,
    "labelZhTw" TEXT NOT NULL,
    "labelEnUs" TEXT NOT NULL,
    "labelJaJp" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerUsername" TEXT,
    "providerEmail" TEXT,
    "avatarAttachmentId" TEXT,
    "avatarUrl" TEXT,
    "scope" TEXT,
    "rawProfile" JSONB,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" "UserEmailKind" NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "EmailVerificationPurpose" NOT NULL,
    "locale" "UserProfileLanguage" NOT NULL DEFAULT 'ZH_CN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthEmailCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "AuthEmailCodePurpose" NOT NULL,
    "locale" "UserProfileLanguage" NOT NULL DEFAULT 'ZH_CN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthEmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthStateToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "provider" "ExternalProvider" NOT NULL,
    "stateHash" TEXT NOT NULL,
    "redirectTo" TEXT,
    "locale" "UserProfileLanguage" NOT NULL DEFAULT 'ZH_CN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthStateToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRegistrationTicket" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" "AuthRegistrationTicketKind" NOT NULL,
    "minecraftAccountId" TEXT,
    "oauthProvider" "ExternalProvider",
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRegistrationTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_app_purpose_idx" ON "Attachment"("app", "purpose");

-- CreateIndex
CREATE INDEX "Attachment_app_category_idx" ON "Attachment"("app", "category");

-- CreateIndex
CREATE INDEX "Attachment_ownerType_ownerId_idx" ON "Attachment"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Attachment_status_idx" ON "Attachment"("status");

-- CreateIndex
CREATE INDEX "Attachment_createdById_idx" ON "Attachment"("createdById");

-- CreateIndex
CREATE INDEX "AttachmentVariant_attachmentId_idx" ON "AttachmentVariant"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttachmentVariant_attachmentId_name_key" ON "AttachmentVariant"("attachmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AuthMeAccount_authmeId_key" ON "AuthMeAccount"("authmeId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthMeAccount_normalizedUsername_key" ON "AuthMeAccount"("normalizedUsername");

-- CreateIndex
CREATE INDEX "AuthMeAccount_username_idx" ON "AuthMeAccount"("username");

-- CreateIndex
CREATE INDEX "AuthMeAccount_realname_idx" ON "AuthMeAccount"("realname");

-- CreateIndex
CREATE INDEX "AuthMeAccount_email_idx" ON "AuthMeAccount"("email");

-- CreateIndex
CREATE INDEX "AuthMeAccount_lastLoginAt_idx" ON "AuthMeAccount"("lastLoginAt");

-- CreateIndex
CREATE INDEX "AuthMeAccount_syncedAt_idx" ON "AuthMeAccount"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LuckPermsPlayer_uuid_key" ON "LuckPermsPlayer"("uuid");

-- CreateIndex
CREATE INDEX "LuckPermsPlayer_normalizedUsername_idx" ON "LuckPermsPlayer"("normalizedUsername");

-- CreateIndex
CREATE INDEX "LuckPermsPlayer_primaryGroup_idx" ON "LuckPermsPlayer"("primaryGroup");

-- CreateIndex
CREATE INDEX "LuckPermsPlayer_syncedAt_idx" ON "LuckPermsPlayer"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LuckPermsGroup_name_key" ON "LuckPermsGroup"("name");

-- CreateIndex
CREATE INDEX "LuckPermsGroup_syncedAt_idx" ON "LuckPermsGroup"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LuckPermsUserPermission_sourceId_key" ON "LuckPermsUserPermission"("sourceId");

-- CreateIndex
CREATE INDEX "LuckPermsUserPermission_uuid_idx" ON "LuckPermsUserPermission"("uuid");

-- CreateIndex
CREATE INDEX "LuckPermsUserPermission_permission_idx" ON "LuckPermsUserPermission"("permission");

-- CreateIndex
CREATE INDEX "LuckPermsUserPermission_syncedAt_idx" ON "LuckPermsUserPermission"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LuckPermsGroupPermission_sourceId_key" ON "LuckPermsGroupPermission"("sourceId");

-- CreateIndex
CREATE INDEX "LuckPermsGroupPermission_name_idx" ON "LuckPermsGroupPermission"("name");

-- CreateIndex
CREATE INDEX "LuckPermsGroupPermission_permission_idx" ON "LuckPermsGroupPermission"("permission");

-- CreateIndex
CREATE INDEX "LuckPermsGroupPermission_syncedAt_idx" ON "LuckPermsGroupPermission"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LuckPermsAction_sourceId_key" ON "LuckPermsAction"("sourceId");

-- CreateIndex
CREATE INDEX "LuckPermsAction_time_idx" ON "LuckPermsAction"("time");

-- CreateIndex
CREATE INDEX "LuckPermsAction_actorUuid_idx" ON "LuckPermsAction"("actorUuid");

-- CreateIndex
CREATE INDEX "LuckPermsAction_actedUuid_idx" ON "LuckPermsAction"("actedUuid");

-- CreateIndex
CREATE INDEX "LuckPermsAction_syncedAt_idx" ON "LuckPermsAction"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LuckPermsTrack_name_key" ON "LuckPermsTrack"("name");

-- CreateIndex
CREATE INDEX "LuckPermsTrack_syncedAt_idx" ON "LuckPermsTrack"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LuckPermsMessenger_sourceId_key" ON "LuckPermsMessenger"("sourceId");

-- CreateIndex
CREATE INDEX "LuckPermsMessenger_time_idx" ON "LuckPermsMessenger"("time");

-- CreateIndex
CREATE INDEX "LuckPermsMessenger_syncedAt_idx" ON "LuckPermsMessenger"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSyncState_source_key" ON "ExternalSyncState"("source");

-- CreateIndex
CREATE INDEX "ExternalSyncState_running_idx" ON "ExternalSyncState"("running");

-- CreateIndex
CREATE INDEX "ExternalSyncState_lastSuccessAt_idx" ON "ExternalSyncState"("lastSuccessAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSyncTaskState_taskKey_key" ON "ExternalSyncTaskState"("taskKey");

-- CreateIndex
CREATE INDEX "ExternalSyncTaskState_serverId_idx" ON "ExternalSyncTaskState"("serverId");

-- CreateIndex
CREATE INDEX "ExternalSyncTaskState_source_idx" ON "ExternalSyncTaskState"("source");

-- CreateIndex
CREATE INDEX "ExternalSyncTaskState_running_idx" ON "ExternalSyncTaskState"("running");

-- CreateIndex
CREATE INDEX "ExternalSyncTaskState_lastSuccessAt_idx" ON "ExternalSyncTaskState"("lastSuccessAt");

-- CreateIndex
CREATE INDEX "FriendLink_category_enabled_archived_createdAt_idx" ON "FriendLink"("category", "enabled", "archived", "createdAt");

-- CreateIndex
CREATE INDEX "FriendLink_enabled_archived_createdAt_idx" ON "FriendLink"("enabled", "archived", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FriendLinkApplication_approvedLinkId_key" ON "FriendLinkApplication"("approvedLinkId");

-- CreateIndex
CREATE INDEX "FriendLinkApplication_applicantUserId_status_idx" ON "FriendLinkApplication"("applicantUserId", "status");

-- CreateIndex
CREATE INDEX "FriendLinkApplication_status_submittedAt_idx" ON "FriendLinkApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "FriendLinkApplication_expiresAt_idx" ON "FriendLinkApplication"("expiresAt");

-- CreateIndex
CREATE INDEX "FriendLinkApplication_reviewedById_idx" ON "FriendLinkApplication"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftAccount_normalizedUsername_key" ON "MinecraftAccount"("normalizedUsername");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftAccount_uuid_key" ON "MinecraftAccount"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftAccount_authmeId_key" ON "MinecraftAccount"("authmeId");

-- CreateIndex
CREATE INDEX "MinecraftAccount_userId_idx" ON "MinecraftAccount"("userId");

-- CreateIndex
CREATE INDEX "MinecraftAccount_username_idx" ON "MinecraftAccount"("username");

-- CreateIndex
CREATE INDEX "MinecraftAccount_authmeName_idx" ON "MinecraftAccount"("authmeName");

-- CreateIndex
CREATE INDEX "MinecraftAccount_status_idx" ON "MinecraftAccount"("status");

-- CreateIndex
CREATE INDEX "MinecraftAccount_source_idx" ON "MinecraftAccount"("source");

-- CreateIndex
CREATE INDEX "MinecraftAccountBindingHistory_minecraftAccountId_createdAt_idx" ON "MinecraftAccountBindingHistory"("minecraftAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "MinecraftAccountBindingHistory_targetUserId_createdAt_idx" ON "MinecraftAccountBindingHistory"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MinecraftAccountBindingHistory_action_createdAt_idx" ON "MinecraftAccountBindingHistory"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftServer_serverId_key" ON "MinecraftServer"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftServer_code_key" ON "MinecraftServer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PortalBridgeConfig_minecraftServerId_key" ON "PortalBridgeConfig"("minecraftServerId");

-- CreateIndex
CREATE INDEX "PortalBridgeConfig_enabled_idx" ON "PortalBridgeConfig"("enabled");

-- CreateIndex
CREATE INDEX "PortalBridgeConfig_lastConnectionState_idx" ON "PortalBridgeConfig"("lastConnectionState");

-- CreateIndex
CREATE UNIQUE INDEX "PortalBridgeConfig_bridgeId_module_key" ON "PortalBridgeConfig"("bridgeId", "module");

-- CreateIndex
CREATE INDEX "MinecraftServerSnapshot_serverId_idx" ON "MinecraftServerSnapshot"("serverId");

-- CreateIndex
CREATE INDEX "MinecraftServerSnapshot_kind_idx" ON "MinecraftServerSnapshot"("kind");

-- CreateIndex
CREATE INDEX "MinecraftServerSnapshot_observedAt_idx" ON "MinecraftServerSnapshot"("observedAt");

-- CreateIndex
CREATE INDEX "ServerPlayerIdentity_normalizedUsername_idx" ON "ServerPlayerIdentity"("normalizedUsername");

-- CreateIndex
CREATE INDEX "ServerPlayerIdentity_conflictState_idx" ON "ServerPlayerIdentity"("conflictState");

-- CreateIndex
CREATE UNIQUE INDEX "ServerPlayerIdentity_serverId_uuid_key" ON "ServerPlayerIdentity"("serverId", "uuid");

-- CreateIndex
CREATE INDEX "ServerPlayerIdentityEvidence_serverId_uuid_idx" ON "ServerPlayerIdentityEvidence"("serverId", "uuid");

-- CreateIndex
CREATE INDEX "ServerPlayerIdentityEvidence_normalizedUsername_idx" ON "ServerPlayerIdentityEvidence"("normalizedUsername");

-- CreateIndex
CREATE INDEX "ServerPlayerIdentityEvidence_observedAt_idx" ON "ServerPlayerIdentityEvidence"("observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServerPlayerIdentityEvidence_source_sourceMessageId_key" ON "ServerPlayerIdentityEvidence"("source", "sourceMessageId");

-- CreateIndex
CREATE INDEX "ServerPlayerSession_serverId_uuid_idx" ON "ServerPlayerSession"("serverId", "uuid");

-- CreateIndex
CREATE INDEX "ServerPlayerSession_openedAt_idx" ON "ServerPlayerSession"("openedAt");

-- CreateIndex
CREATE INDEX "ServerPlayerSession_closedAt_idx" ON "ServerPlayerSession"("closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServerPlayerSession_serverId_sessionId_key" ON "ServerPlayerSession"("serverId", "sessionId");

-- CreateIndex
CREATE INDEX "MinecraftServerPlayer_serverId_idx" ON "MinecraftServerPlayer"("serverId");

-- CreateIndex
CREATE INDEX "MinecraftServerPlayer_serverId_normalizedUsername_idx" ON "MinecraftServerPlayer"("serverId", "normalizedUsername");

-- CreateIndex
CREATE INDEX "MinecraftServerPlayer_serverId_lastSeenAt_idx" ON "MinecraftServerPlayer"("serverId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftServerPlayer_serverId_uuid_key" ON "MinecraftServerPlayer"("serverId", "uuid");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftServerPlayerData_minecraftServerPlayerId_key" ON "MinecraftServerPlayerData"("minecraftServerPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftServerPlayerStatsSnapshot_minecraftServerPlayerId_key" ON "MinecraftServerPlayerStatsSnapshot"("minecraftServerPlayerId");

-- CreateIndex
CREATE INDEX "MinecraftServerPlayerStatsSnapshot_snapshotId_idx" ON "MinecraftServerPlayerStatsSnapshot"("snapshotId");

-- CreateIndex
CREATE INDEX "MinecraftServerPlayerStatsSnapshot_observedAt_idx" ON "MinecraftServerPlayerStatsSnapshot"("observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftServerPlayerAdvancementsSnapshot_minecraftServerPl_key" ON "MinecraftServerPlayerAdvancementsSnapshot"("minecraftServerPlayerId");

-- CreateIndex
CREATE INDEX "MinecraftServerPlayerAdvancementsSnapshot_snapshotId_idx" ON "MinecraftServerPlayerAdvancementsSnapshot"("snapshotId");

-- CreateIndex
CREATE INDEX "MinecraftServerPlayerAdvancementsSnapshot_observedAt_idx" ON "MinecraftServerPlayerAdvancementsSnapshot"("observedAt");

-- CreateIndex
CREATE INDEX "PlayerAdvancementUnlockEvent_minecraftServerPlayerId_unlock_idx" ON "PlayerAdvancementUnlockEvent"("minecraftServerPlayerId", "unlockedAt");

-- CreateIndex
CREATE INDEX "PlayerAdvancementUnlockEvent_uuid_unlockedAt_idx" ON "PlayerAdvancementUnlockEvent"("uuid", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAdvancementUnlockEvent_minecraftServerPlayerId_advanc_key" ON "PlayerAdvancementUnlockEvent"("minecraftServerPlayerId", "advancementKey");

-- CreateIndex
CREATE INDEX "PortalBridgeMessageReceipt_topic_idx" ON "PortalBridgeMessageReceipt"("topic");

-- CreateIndex
CREATE INDEX "PortalBridgeMessageReceipt_receivedAt_idx" ON "PortalBridgeMessageReceipt"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalBridgeMessageReceipt_messageId_key" ON "PortalBridgeMessageReceipt"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalBridgeMessageReceipt_bridgeConfigId_streamEpoch_seq_key" ON "PortalBridgeMessageReceipt"("bridgeConfigId", "streamEpoch", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "PortalBridgeCommand_commandId_key" ON "PortalBridgeCommand"("commandId");

-- CreateIndex
CREATE INDEX "PortalBridgeCommand_bridgeConfigId_idx" ON "PortalBridgeCommand"("bridgeConfigId");

-- CreateIndex
CREATE INDEX "PortalBridgeCommand_action_idx" ON "PortalBridgeCommand"("action");

-- CreateIndex
CREATE INDEX "PortalBridgeCommand_status_idx" ON "PortalBridgeCommand"("status");

-- CreateIndex
CREATE INDEX "PartnerEntry_section_kind_enabled_archived_sortOrder_idx" ON "PartnerEntry"("section", "kind", "enabled", "archived", "sortOrder");

-- CreateIndex
CREATE INDEX "PartnerEntry_linkedMinecraftServerId_idx" ON "PartnerEntry"("linkedMinecraftServerId");

-- CreateIndex
CREATE INDEX "PartnerEditor_userId_idx" ON "PartnerEditor"("userId");

-- CreateIndex
CREATE INDEX "PartnerEditor_createdById_idx" ON "PartnerEditor"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerEditor_partnerId_userId_key" ON "PartnerEditor"("partnerId", "userId");

-- CreateIndex
CREATE INDEX "PartnerCoreMember_userId_idx" ON "PartnerCoreMember"("userId");

-- CreateIndex
CREATE INDEX "PartnerCoreMember_createdById_idx" ON "PartnerCoreMember"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCoreMember_partnerId_userId_key" ON "PartnerCoreMember"("partnerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_hydrolineId_key" ON "User"("hydrolineId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_lastAuthActivityAt_idx" ON "User"("lastAuthActivityAt");

-- CreateIndex
CREATE INDEX "UserActivityEvent_userId_occurredAt_idx" ON "UserActivityEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "UserActivityEvent_type_occurredAt_idx" ON "UserActivityEvent"("type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserActivityEvent_userId_type_occurredAt_key" ON "UserActivityEvent"("userId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfilePreferences_userId_key" ON "UserProfilePreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfilePrivacy_userId_key" ON "UserProfilePrivacy"("userId");

-- CreateIndex
CREATE INDEX "UserProfileBadge_userId_idx" ON "UserProfileBadge"("userId");

-- CreateIndex
CREATE INDEX "UserProfileBadge_badgeId_idx" ON "UserProfileBadge"("badgeId");

-- CreateIndex
CREATE INDEX "UserProfileBadge_userId_sortOrder_idx" ON "UserProfileBadge"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfileBadge_userId_badgeId_key" ON "UserProfileBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileBadge_key_key" ON "ProfileBadge"("key");

-- CreateIndex
CREATE INDEX "ProfileBadge_enabled_sortOrder_idx" ON "ProfileBadge"("enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_userId_key" ON "UserCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- CreateIndex
CREATE INDEX "ExternalAccount_userId_idx" ON "ExternalAccount"("userId");

-- CreateIndex
CREATE INDEX "ExternalAccount_userId_provider_idx" ON "ExternalAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "ExternalAccount_disconnectedAt_idx" ON "ExternalAccount"("disconnectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAccount_provider_providerAccountId_key" ON "ExternalAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_email_key" ON "UserEmail"("email");

-- CreateIndex
CREATE INDEX "UserEmail_userId_idx" ON "UserEmail"("userId");

-- CreateIndex
CREATE INDEX "UserEmail_userId_kind_idx" ON "UserEmail"("userId", "kind");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_email_purpose_idx" ON "EmailVerificationToken"("userId", "email", "purpose");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_consumedAt_idx" ON "EmailVerificationToken"("consumedAt");

-- CreateIndex
CREATE INDEX "AuthEmailCode_email_purpose_idx" ON "AuthEmailCode"("email", "purpose");

-- CreateIndex
CREATE INDEX "AuthEmailCode_expiresAt_idx" ON "AuthEmailCode"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthEmailCode_consumedAt_idx" ON "AuthEmailCode"("consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthStateToken_stateHash_key" ON "OAuthStateToken"("stateHash");

-- CreateIndex
CREATE INDEX "OAuthStateToken_userId_idx" ON "OAuthStateToken"("userId");

-- CreateIndex
CREATE INDEX "OAuthStateToken_provider_idx" ON "OAuthStateToken"("provider");

-- CreateIndex
CREATE INDEX "OAuthStateToken_expiresAt_idx" ON "OAuthStateToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthRegistrationTicket_tokenHash_key" ON "AuthRegistrationTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthRegistrationTicket_kind_expiresAt_idx" ON "AuthRegistrationTicket"("kind", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthRegistrationTicket_consumedAt_idx" ON "AuthRegistrationTicket"("consumedAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_type_idx" ON "SecurityEvent"("type");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachmentVariant" ADD CONSTRAINT "AttachmentVariant_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSyncTaskState" ADD CONSTRAINT "ExternalSyncTaskState_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MinecraftServer"("serverId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLinkApplication" ADD CONSTRAINT "FriendLinkApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLinkApplication" ADD CONSTRAINT "FriendLinkApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLinkApplication" ADD CONSTRAINT "FriendLinkApplication_approvedLinkId_fkey" FOREIGN KEY ("approvedLinkId") REFERENCES "FriendLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftAccount" ADD CONSTRAINT "MinecraftAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftAccount" ADD CONSTRAINT "MinecraftAccount_authmeId_fkey" FOREIGN KEY ("authmeId") REFERENCES "AuthMeAccount"("authmeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftAccountBindingHistory" ADD CONSTRAINT "MinecraftAccountBindingHistory_minecraftAccountId_fkey" FOREIGN KEY ("minecraftAccountId") REFERENCES "MinecraftAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalBridgeConfig" ADD CONSTRAINT "PortalBridgeConfig_minecraftServerId_fkey" FOREIGN KEY ("minecraftServerId") REFERENCES "MinecraftServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftServerSnapshot" ADD CONSTRAINT "MinecraftServerSnapshot_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MinecraftServer"("serverId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerPlayerIdentity" ADD CONSTRAINT "ServerPlayerIdentity_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MinecraftServer"("serverId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerPlayerSession" ADD CONSTRAINT "ServerPlayerSession_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MinecraftServer"("serverId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftServerPlayer" ADD CONSTRAINT "MinecraftServerPlayer_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MinecraftServer"("serverId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftServerPlayerData" ADD CONSTRAINT "MinecraftServerPlayerData_minecraftServerPlayerId_fkey" FOREIGN KEY ("minecraftServerPlayerId") REFERENCES "MinecraftServerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftServerPlayerStatsSnapshot" ADD CONSTRAINT "MinecraftServerPlayerStatsSnapshot_minecraftServerPlayerId_fkey" FOREIGN KEY ("minecraftServerPlayerId") REFERENCES "MinecraftServerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftServerPlayerAdvancementsSnapshot" ADD CONSTRAINT "MinecraftServerPlayerAdvancementsSnapshot_minecraftServerP_fkey" FOREIGN KEY ("minecraftServerPlayerId") REFERENCES "MinecraftServerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAdvancementUnlockEvent" ADD CONSTRAINT "PlayerAdvancementUnlockEvent_minecraftServerPlayerId_fkey" FOREIGN KEY ("minecraftServerPlayerId") REFERENCES "MinecraftServerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalBridgeMessageReceipt" ADD CONSTRAINT "PortalBridgeMessageReceipt_bridgeConfigId_fkey" FOREIGN KEY ("bridgeConfigId") REFERENCES "PortalBridgeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalBridgeCommand" ADD CONSTRAINT "PortalBridgeCommand_bridgeConfigId_fkey" FOREIGN KEY ("bridgeConfigId") REFERENCES "PortalBridgeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEntry" ADD CONSTRAINT "PartnerEntry_linkedMinecraftServerId_fkey" FOREIGN KEY ("linkedMinecraftServerId") REFERENCES "MinecraftServer"("serverId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEditor" ADD CONSTRAINT "PartnerEditor_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEditor" ADD CONSTRAINT "PartnerEditor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEditor" ADD CONSTRAINT "PartnerEditor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCoreMember" ADD CONSTRAINT "PartnerCoreMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCoreMember" ADD CONSTRAINT "PartnerCoreMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCoreMember" ADD CONSTRAINT "PartnerCoreMember_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivityEvent" ADD CONSTRAINT "UserActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfilePreferences" ADD CONSTRAINT "UserProfilePreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfilePrivacy" ADD CONSTRAINT "UserProfilePrivacy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileBadge" ADD CONSTRAINT "UserProfileBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileBadge" ADD CONSTRAINT "UserProfileBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "ProfileBadge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmail" ADD CONSTRAINT "UserEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthStateToken" ADD CONSTRAINT "OAuthStateToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthRegistrationTicket" ADD CONSTRAINT "AuthRegistrationTicket_minecraftAccountId_fkey" FOREIGN KEY ("minecraftAccountId") REFERENCES "MinecraftAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
