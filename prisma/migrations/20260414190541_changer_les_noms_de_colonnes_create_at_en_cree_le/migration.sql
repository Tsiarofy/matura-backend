/*
  Warnings:

  - You are about to drop the column `createAt` on the `alertes_projets` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `candidatures` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `candidatures` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `demandes_accompagnement` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `demandes_accompagnement` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `finances_projets` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `offres_financement` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `offres_financement` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `projets` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `projets` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `stades` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `tokens_refresh` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `utilisateurs` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `utilisateurs` table. All the data in the column will be lost.
  - Added the required column `maj_le` to the `candidatures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maj_le` to the `demandes_accompagnement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maj_le` to the `evaluations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maj_le` to the `finances_projets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maj_le` to the `offres_financement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maj_le` to the `projets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maj_le` to the `stades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maj_le` to the `utilisateurs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "alertes_projets" DROP COLUMN "createAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "candidatures" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "demandes_accompagnement" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "finances_projets" DROP COLUMN "updateAt",
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "offres_financement" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "projets" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "stades" DROP COLUMN "updateAt",
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tokens_refresh" DROP COLUMN "createAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "utilisateurs" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maj_le" TIMESTAMP(3) NOT NULL;
