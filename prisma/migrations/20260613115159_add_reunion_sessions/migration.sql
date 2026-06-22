-- CreateEnum
CREATE TYPE "TypeReunion" AS ENUM ('SUIVI', 'ENTRETIEN');

-- CreateEnum
CREATE TYPE "StatutReunion" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'REFUSE', 'EN_COURS', 'TERMINEE', 'EXPIREE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeNotification" ADD VALUE 'REUNION_DEMANDEE';
ALTER TYPE "TypeNotification" ADD VALUE 'REUNION_CONFIRMEE';
ALTER TYPE "TypeNotification" ADD VALUE 'REUNION_REFUSEE';
ALTER TYPE "TypeNotification" ADD VALUE 'APPEL_INSTANTANE';

-- CreateTable
CREATE TABLE "reunion_sessions" (
    "id" TEXT NOT NULL,
    "type" "TypeReunion" NOT NULL,
    "statut" "StatutReunion" NOT NULL DEFAULT 'EN_ATTENTE',
    "initiateur_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "date_planifiee" TIMESTAMP(3),
    "livekit_room" TEXT,
    "livekit_token" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_le" TIMESTAMP(3),
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reunion_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reunion_sessions_initiateur_id_idx" ON "reunion_sessions"("initiateur_id");

-- CreateIndex
CREATE INDEX "reunion_sessions_participant_id_idx" ON "reunion_sessions"("participant_id");

-- CreateIndex
CREATE INDEX "reunion_sessions_projet_id_idx" ON "reunion_sessions"("projet_id");

-- AddForeignKey
ALTER TABLE "reunion_sessions" ADD CONSTRAINT "reunion_sessions_initiateur_id_fkey" FOREIGN KEY ("initiateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_sessions" ADD CONSTRAINT "reunion_sessions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_sessions" ADD CONSTRAINT "reunion_sessions_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
