-- DropForeignKey
ALTER TABLE "fichiers_soumission" DROP CONSTRAINT "fichiers_soumission_fichier_requis_id_fkey";

-- AlterTable
ALTER TABLE "fichiers_soumission" ALTER COLUMN "fichier_requis_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fichiers_soumission" ADD CONSTRAINT "fichiers_soumission_fichier_requis_id_fkey" FOREIGN KEY ("fichier_requis_id") REFERENCES "fichiers_requis_mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
