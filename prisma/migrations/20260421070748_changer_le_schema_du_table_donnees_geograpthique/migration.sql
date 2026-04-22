/*
  Warnings:

  - You are about to drop the column `niveau` on the `donnees_geographiques` table. All the data in the column will be lost.
  - You are about to drop the column `projection_2025` on the `donnees_geographiques` table. All the data in the column will be lost.
  - Added the required column `projection_2026` to the `donnees_geographiques` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "donnees_geographiques_niveau_idx";

-- AlterTable
ALTER TABLE "donnees_geographiques" DROP COLUMN "niveau",
DROP COLUMN "projection_2025",
ADD COLUMN     "projection_2026" INTEGER NOT NULL;
