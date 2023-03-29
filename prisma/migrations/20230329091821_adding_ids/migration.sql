/*
  Warnings:

  - The primary key for the `Series` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `Scenes` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "seriesId" TEXT NOT NULL,
    "length" INTEGER NOT NULL,
    CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("id", "length", "path", "seriesId", "watched") SELECT "id", "length", "path", "seriesId", "watched" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_path_key" ON "Episode"("path");
CREATE TABLE "new_Series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Series" ("id", "name") SELECT "id", "name" FROM "Series";
DROP TABLE "Series";
ALTER TABLE "new_Series" RENAME TO "Series";
CREATE UNIQUE INDEX "Series_name_key" ON "Series"("name");
CREATE TABLE "new_Scenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "episodeId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    CONSTRAINT "Scenes_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scenes_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Scenes" ("endTime", "episodeId", "name", "seriesId", "startTime", "views") SELECT "endTime", "episodeId", "name", "seriesId", "startTime", "views" FROM "Scenes";
DROP TABLE "Scenes";
ALTER TABLE "new_Scenes" RENAME TO "Scenes";
CREATE UNIQUE INDEX "Scenes_name_key" ON "Scenes"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
