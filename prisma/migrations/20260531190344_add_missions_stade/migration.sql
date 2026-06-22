-- AlterTable
ALTER TABLE "stades" ADD COLUMN     "missions_completees" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "missions_stade" (
    "id" TEXT NOT NULL,
    "stade_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "objectif" TEXT NOT NULL,
    "type_preuve_attendue" TEXT NOT NULL,
    "preuve_obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "date_limite" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_stade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions_soumissions" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "entrepreneur_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'INACHEVEE',
    "fichier_url" TEXT,
    "fichier_nom" TEXT,
    "fichier_type" TEXT,
    "fichier_taille_octets" INTEGER,
    "motif_rejet" TEXT,
    "valide_le" TIMESTAMP(3),
    "soumis_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_soumissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "missions_stade_stade_id_idx" ON "missions_stade"("stade_id");

-- CreateIndex
CREATE UNIQUE INDEX "missions_soumissions_mission_id_entrepreneur_id_key" ON "missions_soumissions"("mission_id", "entrepreneur_id");

-- AddForeignKey
ALTER TABLE "missions_stade" ADD CONSTRAINT "missions_stade_stade_id_fkey" FOREIGN KEY ("stade_id") REFERENCES "stades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_stade" ADD CONSTRAINT "missions_stade_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_soumissions" ADD CONSTRAINT "missions_soumissions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions_stade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_soumissions" ADD CONSTRAINT "missions_soumissions_entrepreneur_id_fkey" FOREIGN KEY ("entrepreneur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
