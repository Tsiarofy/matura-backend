-- AlterTable
ALTER TABLE "utilisateurs" ALTER COLUMN "statut_compte" SET DEFAULT 'EN_ATTENTE';

-- CreateIndex
CREATE INDEX "notifications_utilisateur_id_cree_le_idx" ON "notifications"("utilisateur_id", "cree_le");

-- CreateIndex
CREATE INDEX "reunion_sessions_statut_idx" ON "reunion_sessions"("statut");
