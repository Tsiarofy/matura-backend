/*
  Warnings:

  - You are about to drop the column `fichier_nom` on the `missions_soumissions` table. All the data in the column will be lost.
  - You are about to drop the column `fichier_taille_octets` on the `missions_soumissions` table. All the data in the column will be lost.
  - You are about to drop the column `fichier_type` on the `missions_soumissions` table. All the data in the column will be lost.
  - You are about to drop the column `fichier_url` on the `missions_soumissions` table. All the data in the column will be lost.
  - You are about to drop the column `preuve_obligatoire` on the `missions_stade` table. All the data in the column will be lost.
  - You are about to drop the column `type_preuve_attendue` on the `missions_stade` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "missions_soumissions" DROP COLUMN "fichier_nom",
DROP COLUMN "fichier_taille_octets",
DROP COLUMN "fichier_type",
DROP COLUMN "fichier_url";

-- AlterTable
ALTER TABLE "missions_stade" DROP COLUMN "preuve_obligatoire",
DROP COLUMN "type_preuve_attendue";

-- CreateTable
CREATE TABLE "fichiers_requis_mission" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "fichiers_requis_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichiers_soumission" (
    "id" TEXT NOT NULL,
    "soumission_id" TEXT NOT NULL,
    "fichier_requis_id" TEXT NOT NULL,
    "fichier_url" TEXT NOT NULL,
    "fichier_nom" TEXT NOT NULL,
    "fichier_type" TEXT NOT NULL,
    "fichier_taille_octets" INTEGER,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichiers_soumission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fichiers_requis_mission_mission_id_idx" ON "fichiers_requis_mission"("mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "fichiers_soumission_soumission_id_fichier_requis_id_key" ON "fichiers_soumission"("soumission_id", "fichier_requis_id");

-- AddForeignKey
ALTER TABLE "fichiers_requis_mission" ADD CONSTRAINT "fichiers_requis_mission_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions_stade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichiers_soumission" ADD CONSTRAINT "fichiers_soumission_soumission_id_fkey" FOREIGN KEY ("soumission_id") REFERENCES "missions_soumissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichiers_soumission" ADD CONSTRAINT "fichiers_soumission_fichier_requis_id_fkey" FOREIGN KEY ("fichier_requis_id") REFERENCES "fichiers_requis_mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
