-- Collapse server lifecycle into ONLINE and ARCHIVED. Historical Bridge rows stay
-- intact so their message receipts and command history remain queryable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "MinecraftServer" AS server
    LEFT JOIN "PortalBridgeConfig" AS bridge
      ON bridge."minecraftServerId" = server.id
    WHERE server.kind <> 'ARCHIVE'
      AND server.status <> 'ARCHIVED'
      AND (bridge.id IS NULL OR bridge."encryptedSecret" IS NULL OR bridge.enabled = false)
  ) THEN
    RAISE EXCEPTION 'Every ONLINE Minecraft server must have an enabled PortalBridge config with a secret before lifecycle simplification';
  END IF;
END $$;

CREATE TYPE "MinecraftServerStatus_next" AS ENUM ('ONLINE', 'ARCHIVED');
ALTER TABLE "MinecraftServer" ADD COLUMN "status_next" "MinecraftServerStatus_next";

UPDATE "MinecraftServer"
SET "status_next" = CASE
  WHEN kind = 'ARCHIVE' OR status = 'ARCHIVED' THEN 'ARCHIVED'::"MinecraftServerStatus_next"
  ELSE 'ONLINE'::"MinecraftServerStatus_next"
END;

-- Archiving never destroys Bridge history; credentials alone are removed.
UPDATE "PortalBridgeConfig" AS bridge
SET "encryptedSecret" = NULL
FROM "MinecraftServer" AS server
WHERE bridge."minecraftServerId" = server.id
  AND server."status_next" = 'ARCHIVED';

UPDATE "MinecraftServer"
SET "isDefault" = false
WHERE "status_next" = 'ARCHIVED' AND "isDefault" = true;

UPDATE "MinecraftServer"
SET "isDefault" = true
WHERE id = (
  SELECT id
  FROM "MinecraftServer"
  WHERE "status_next" = 'ONLINE'
  ORDER BY "sortOrder" ASC, "createdAt" ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM "MinecraftServer"
  WHERE "status_next" = 'ONLINE' AND "isDefault" = true
);

ALTER TABLE "MinecraftServer" DROP COLUMN "status";
ALTER TABLE "MinecraftServer" RENAME COLUMN "status_next" TO "status";
ALTER TABLE "MinecraftServer" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "MinecraftServer" ALTER COLUMN "status" SET DEFAULT 'ONLINE';
ALTER TABLE "MinecraftServer" DROP COLUMN "enabled", DROP COLUMN "kind", DROP COLUMN "dataSourceMode";
ALTER TABLE "PortalBridgeConfig" DROP COLUMN "enabled";

DROP TYPE "MinecraftServerStatus";
ALTER TYPE "MinecraftServerStatus_next" RENAME TO "MinecraftServerStatus";
DROP TYPE "MinecraftServerKind";
DROP TYPE "MinecraftServerDataSourceMode";
