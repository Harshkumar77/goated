/*
  Warnings:

  - A unique constraint covering the columns `[path]` on the table `Episode` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Episode_path_key" ON "Episode"("path");
