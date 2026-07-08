ALTER TABLE "MinecraftServer"
ADD COLUMN "nameZhCn" TEXT,
ADD COLUMN "nameZhTw" TEXT,
ADD COLUMN "nameEnUs" TEXT,
ADD COLUMN "nameJaJp" TEXT,
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MinecraftServer"
SET
  "nameZhCn" = "name",
  "nameZhTw" = COALESCE("nameZhTw", "name"),
  "nameEnUs" = COALESCE("nameEnUs", "name"),
  "nameJaJp" = COALESCE("nameJaJp", "name");

WITH ranked AS (
  SELECT "id"
  FROM "MinecraftServer"
  ORDER BY "sortOrder" ASC, "createdAt" ASC, "id" ASC
  LIMIT 1
)
UPDATE "MinecraftServer"
SET "isDefault" = true
WHERE "id" IN (SELECT "id" FROM ranked);

CREATE UNIQUE INDEX "MinecraftServer_isDefault_true_key"
ON "MinecraftServer"("isDefault")
WHERE "isDefault" = true;
