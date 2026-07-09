UPDATE "MinecraftServer"
SET
  "nameZhTw" = COALESCE(NULLIF("nameZhTw", ''), "nameZhCn"),
  "nameEnUs" = COALESCE(NULLIF("nameEnUs", ''), "nameZhCn"),
  "nameJaJp" = COALESCE(NULLIF("nameJaJp", ''), "nameZhCn");

ALTER TABLE "MinecraftServer"
ALTER COLUMN "nameZhTw" SET NOT NULL,
ALTER COLUMN "nameEnUs" SET NOT NULL,
ALTER COLUMN "nameJaJp" SET NOT NULL;
