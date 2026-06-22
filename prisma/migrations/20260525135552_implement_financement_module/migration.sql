/*
  Warnings:

  - The values [VU,INTERESSE,REFUSE,FINANCE] on the enum `StatutCandidature` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `est_actif` on the `offres_financement` table. All the data in the column will be lost.
  - Added the required column `entrepreneur_id` to the `candidatures` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type_financement` on the `offres_financement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "StatutOffre" AS ENUM ('OUVERTE', 'EN_COURS', 'FERMEE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "TypeFinancement" AS ENUM ('SUBVENTION', 'PRET', 'EQUITY', 'OBLIGATION', 'DON');

-- AlterEnum
BEGIN;
CREATE TYPE "StatutCandidature_new" AS ENUM ('EN_ATTENTE', 'EN_REVUE', 'ACCEPTEE', 'REJETEE', 'RETIREE');
ALTER TABLE "public"."candidatures" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "candidatures" ALTER COLUMN "statut" TYPE "StatutCandidature_new" USING ("statut"::text::"StatutCandidature_new");
ALTER TYPE "StatutCandidature" RENAME TO "StatutCandidature_old";
ALTER TYPE "StatutCandidature_new" RENAME TO "StatutCandidature";
DROP TYPE "public"."StatutCandidature_old";
ALTER TABLE "candidatures" ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';
COMMIT;

-- AlterTable
ALTER TABLE "candidatures" ADD COLUMN     "entrepreneur_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "offres_financement" DROP COLUMN "est_actif",
ADD COLUMN     "devise" TEXT NOT NULL DEFAULT 'MGA',
ADD COLUMN     "statut" "StatutOffre" NOT NULL DEFAULT 'OUVERTE',
DROP COLUMN "type_financement",
ADD COLUMN     "type_financement" "TypeFinancement" NOT NULL;

-- DropEnum
DROP TYPE "TypeFinancementOffre";

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_entrepreneur_id_fkey" FOREIGN KEY ("entrepreneur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
