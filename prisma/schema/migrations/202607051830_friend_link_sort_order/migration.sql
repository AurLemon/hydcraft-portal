ALTER TABLE "FriendLink"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "category"
			ORDER BY "createdAt" ASC, "id" ASC
		) - 1 AS next_sort_order
	FROM "FriendLink"
)
UPDATE "FriendLink" AS link
SET "sortOrder" = ranked.next_sort_order
FROM ranked
WHERE link."id" = ranked."id";

DROP INDEX IF EXISTS "FriendLink_category_enabled_archived_createdAt_idx";
DROP INDEX IF EXISTS "FriendLink_enabled_archived_createdAt_idx";

CREATE INDEX "FriendLink_category_enabled_archived_sortOrder_createdAt_idx"
ON "FriendLink"("category", "enabled", "archived", "sortOrder", "createdAt");

CREATE INDEX "FriendLink_enabled_archived_sortOrder_createdAt_idx"
ON "FriendLink"("enabled", "archived", "sortOrder", "createdAt");
