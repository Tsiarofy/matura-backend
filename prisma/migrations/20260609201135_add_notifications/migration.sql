-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('STADE_SOUMIS', 'STADE_VALIDE', 'STADE_RENVOYE', 'MISSION_REJETEE', 'MISSION_VALIDEE', 'DEMANDE_RECUE', 'DEMANDE_ACCEPTEE', 'DEMANDE_REFUSEE', 'CANDIDATURE_MAJ', 'MISSION_DEADLINE_PROCHE');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "lien_relatif" TEXT,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_utilisateur_id_lue_idx" ON "notifications"("utilisateur_id", "lue");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
