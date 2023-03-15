/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Series` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Series_name_key" ON "Series"("name");
