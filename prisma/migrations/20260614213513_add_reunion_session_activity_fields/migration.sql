-- AlterTable
ALTER TABLE "reunion_sessions" ADD COLUMN     "initiateur_joint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "participant_joint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vide_depuis" TIMESTAMP(3);
