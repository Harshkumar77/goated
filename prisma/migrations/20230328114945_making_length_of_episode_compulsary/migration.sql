/*
  Warnings:

  - Made the column `length` on table `Episode` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
