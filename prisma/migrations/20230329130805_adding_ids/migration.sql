-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_History" (
    "episodeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL PRIMARY KEY DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "History_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_History" ("createdAt", "episodeId") SELECT "createdAt", "episodeId" FROM "History";
DROP TABLE "History";
ALTER TABLE "new_History" RENAME TO "History";
CREATE UNIQUE INDEX "History_createdAt_key" ON "History"("createdAt");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
