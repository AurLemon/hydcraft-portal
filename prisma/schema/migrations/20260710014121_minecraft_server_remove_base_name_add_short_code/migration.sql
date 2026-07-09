ALTER TABLE "MinecraftServer"
ADD COLUMN "shortCode" TEXT;

UPDATE "MinecraftServer"
SET
  "nameZhCn" = COALESCE("nameZhCn", "name"),
  "shortCode" = COALESCE(NULLIF("shortCode", ''), "code");

ALTER TABLE "MinecraftServer"
ALTER COLUMN "nameZhCn" SET NOT NULL,
ALTER COLUMN "shortCode" SET NOT NULL;

ALTER TABLE "MinecraftServer"
DROP COLUMN "name";
