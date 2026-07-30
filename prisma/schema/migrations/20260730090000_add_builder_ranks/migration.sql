CREATE TYPE "BuilderRank" AS ENUM ('CHIEF', 'SENIOR', 'PRACTICING', 'APPRENTICE');

ALTER TABLE "User"
  ADD COLUMN "builderRank" "BuilderRank",
  ADD COLUMN "builderRankCommentZhCn" TEXT,
  ADD COLUMN "builderRankCommentZhTw" TEXT,
  ADD COLUMN "builderRankCommentEnUs" TEXT,
  ADD COLUMN "builderRankCommentJaJp" TEXT,
  ADD COLUMN "builderRankManagedByAdmin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "builderRank" = 'APPRENTICE';

CREATE INDEX "User_builderRank_idx" ON "User"("builderRank");
