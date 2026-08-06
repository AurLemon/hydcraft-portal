-- BlueMap assets are configured per server at a direct map-data root.
-- Legacy map configuration is intentionally discarded; historical player data remains intact.
DROP TABLE IF EXISTS "MinecraftServerMapConfig";

CREATE TABLE "MinecraftServerBlueMapConfig" (
    "id" TEXT NOT NULL,
    "minecraftServerId" TEXT NOT NULL,
    "assetsBaseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinecraftServerBlueMapConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MinecraftServerBlueMapConfig_minecraftServerId_key"
    ON "MinecraftServerBlueMapConfig"("minecraftServerId");

ALTER TABLE "MinecraftServerBlueMapConfig"
    ADD CONSTRAINT "MinecraftServerBlueMapConfig_minecraftServerId_fkey"
    FOREIGN KEY ("minecraftServerId") REFERENCES "MinecraftServer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
