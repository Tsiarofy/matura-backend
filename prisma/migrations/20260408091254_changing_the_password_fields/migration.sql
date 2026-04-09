/*
  Warnings:

  - You are about to drop the column `mot_de_passe` on the `utilisateurs` table. All the data in the column will be lost.
  - Added the required column `password` to the `utilisateurs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "utilisateurs" DROP COLUMN "mot_de_passe",
ADD COLUMN     "password" TEXT NOT NULL;
