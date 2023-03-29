/*
  Warnings:

  - The primary key for the `Episode` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateTable
CREATE TABLE "Scenes" (
    "name" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "episodeId" TEXT NOT NULL,
    "seriesId" INTEGER NOT NULL,
    CONSTRAINT "Scenes_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scenes_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_History" (
    "episodeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "History_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_History" ("createdAt", "episodeId") SELECT "createdAt", "episodeId" FROM "History";
DROP TABLE "History";
ALTER TABLE "new_History" RENAME TO "History";
CREATE UNIQUE INDEX "History_createdAt_key" ON "History"("createdAt");
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "seriesId" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("id", "length", "path", "seriesId", "watched") SELECT "id", "length", "path", "seriesId", "watched" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_path_key" ON "Episode"("path");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Scenes_name_key" ON "Scenes"("name");
