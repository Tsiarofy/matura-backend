/*
  Warnings:

  - You are about to drop the column `cree_le` on the `alertes_projets` table. All the data in the column will be lost.
  - You are about to drop the column `cree_le` on the `candidatures` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `candidatures` table. All the data in the column will be lost.
  - You are about to drop the column `cree_le` on the `demandes_accompagnement` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `demandes_accompagnement` table. All the data in the column will be lost.
  - You are about to drop the column `cree_le` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `finances_projets` table. All the data in the column will be lost.
  - You are about to drop the column `cree_le` on the `offres_financement` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `offres_financement` table. All the data in the column will be lost.
  - You are about to drop the column `cree_le` on the `projets` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `projets` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `stades` table. All the data in the column will be lost.
  - You are about to drop the column `cree_le` on the `tokens_refresh` table. All the data in the column will be lost.
  - You are about to drop the column `cree_le` on the `utilisateurs` table. All the data in the column will be lost.
  - You are about to drop the column `mis_a_jour_le` on the `utilisateurs` table. All the data in the column will be lost.
  - Added the required column `updateAt` to the `candidatures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `demandes_accompagnement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `evaluations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `finances_projets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `offres_financement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `projets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `stades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `utilisateurs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "alertes_projets" DROP COLUMN "cree_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "candidatures" DROP COLUMN "cree_le",
DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "demandes_accompagnement" DROP COLUMN "cree_le",
DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "cree_le",
DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "finances_projets" DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "offres_financement" DROP COLUMN "cree_le",
DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "projets" DROP COLUMN "cree_le",
DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "stades" DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tokens_refresh" DROP COLUMN "cree_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "utilisateurs" DROP COLUMN "cree_le",
DROP COLUMN "mis_a_jour_le",
ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;
