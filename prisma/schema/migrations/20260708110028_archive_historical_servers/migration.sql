-- CreateEnum
CREATE TYPE "MinecraftServerKind" AS ENUM ('MAIN', 'ARCHIVE', 'EVENT', 'TEST');

-- CreateEnum
CREATE TYPE "MinecraftServerStatus" AS ENUM ('PLANNED', 'LIVE', 'FROZEN', 'ARCHIVED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "MinecraftServerDataSourceMode" AS ENUM ('PORTAL_BRIDGE', 'IMPORTED', 'MIXED');

-- CreateEnum
CREATE TYPE "MinecraftServerPeriodKind" AS ENUM ('LIVE', 'ARCHIVE', 'EVENT', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "MinecraftAccountIdentityKind" AS ENUM ('AUTHENTICATED', 'HISTORICAL');

-- CreateEnum
CREATE TYPE "MinecraftAccountAssignmentMode" AS ENUM ('IMPORTED_UNASSIGNED', 'AUTHME_VERIFIED', 'ADMIN_ASSIGNED_HISTORICAL');

-- CreateEnum
CREATE TYPE "ArchiveImportRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MinecraftAccountBindingAction" ADD VALUE 'ADMIN_HISTORICAL_ASSIGNED';
ALTER TYPE "MinecraftAccountBindingAction" ADD VALUE 'ADMIN_HISTORICAL_UNASSIGNED';

-- AlterTable
ALTER TABLE "MinecraftAccount" ADD COLUMN     "assignmentMode" "MinecraftAccountAssignmentMode" NOT NULL DEFAULT 'IMPORTED_UNASSIGNED',
ADD COLUMN     "identityKind" "MinecraftAccountIdentityKind" NOT NULL DEFAULT 'AUTHENTICATED';

-- AlterTable
ALTER TABLE "MinecraftServer" ADD COLUMN     "dataSourceMode" "MinecraftServerDataSourceMode" NOT NULL DEFAULT 'PORTAL_BRIDGE',
ADD COLUMN     "kind" "MinecraftServerKind" NOT NULL DEFAULT 'MAIN',
ADD COLUMN     "status" "MinecraftServerStatus" NOT NULL DEFAULT 'LIVE';

-- CreateTable
CREATE TABLE "MinecraftServerPeriod" (
    "id" TEXT NOT NULL,
    "minecraftServerId" TEXT NOT NULL,
    "kind" "MinecraftServerPeriodKind" NOT NULL DEFAULT 'LIVE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinecraftServerPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftServerMapConfig" (
    "id" TEXT NOT NULL,
    "minecraftServerId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "hasTiles" BOOLEAN NOT NULL DEFAULT false,
    "tileBaseUrl" TEXT,
    "worldName" TEXT NOT NULL DEFAULT 'world',
    "mapName" TEXT NOT NULL DEFAULT 'flat',
    "tileExtension" TEXT NOT NULL DEFAULT 'jpg',
    "defaultCenterX" DOUBLE PRECISION NOT NULL DEFAULT 811,
    "defaultCenterZ" DOUBLE PRECISION NOT NULL DEFAULT 2933,
    "defaultZoom" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinecraftServerMapConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveImportRun" (
    "id" TEXT NOT NULL,
    "minecraftServerId" TEXT NOT NULL,
    "status" "ArchiveImportRunStatus" NOT NULL DEFAULT 'RUNNING',
    "artifactPath" TEXT NOT NULL,
    "artifactHash" TEXT,
    "artifactServerId" TEXT,
    "artifactServerName" TEXT,
    "artifactVersion" TEXT,
    "scannedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),
    "playersObserved" INTEGER NOT NULL DEFAULT 0,
    "playersUpdated" INTEGER NOT NULL DEFAULT 0,
    "accountsMatched" INTEGER NOT NULL DEFAULT 0,
    "historicalAccountsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MinecraftServerPeriod_minecraftServerId_sortOrder_idx" ON "MinecraftServerPeriod"("minecraftServerId", "sortOrder");

-- CreateIndex
CREATE INDEX "MinecraftServerPeriod_startedAt_idx" ON "MinecraftServerPeriod"("startedAt");

-- CreateIndex
CREATE INDEX "MinecraftServerPeriod_endedAt_idx" ON "MinecraftServerPeriod"("endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftServerMapConfig_minecraftServerId_key" ON "MinecraftServerMapConfig"("minecraftServerId");

-- CreateIndex
CREATE INDEX "ArchiveImportRun_minecraftServerId_createdAt_idx" ON "ArchiveImportRun"("minecraftServerId", "createdAt");

-- CreateIndex
CREATE INDEX "ArchiveImportRun_status_createdAt_idx" ON "ArchiveImportRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MinecraftAccount_identityKind_idx" ON "MinecraftAccount"("identityKind");

-- CreateIndex
CREATE INDEX "MinecraftAccount_assignmentMode_idx" ON "MinecraftAccount"("assignmentMode");

-- AddForeignKey
ALTER TABLE "MinecraftServerPeriod" ADD CONSTRAINT "MinecraftServerPeriod_minecraftServerId_fkey" FOREIGN KEY ("minecraftServerId") REFERENCES "MinecraftServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinecraftServerMapConfig" ADD CONSTRAINT "MinecraftServerMapConfig_minecraftServerId_fkey" FOREIGN KEY ("minecraftServerId") REFERENCES "MinecraftServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveImportRun" ADD CONSTRAINT "ArchiveImportRun_minecraftServerId_fkey" FOREIGN KEY ("minecraftServerId") REFERENCES "MinecraftServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
