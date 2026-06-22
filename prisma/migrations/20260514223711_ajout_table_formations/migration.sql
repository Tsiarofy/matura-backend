-- CreateEnum
CREATE TYPE "TypeCible" AS ENUM ('B2C', 'B2B', 'B2B2C');

-- CreateTable
CREATE TABLE "formations" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "auteur_id" TEXT NOT NULL,
    "domaine" "DomainProjet" NOT NULL,
    "stade_cible" INTEGER,
    "type_cible" "TypeCible",
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "contenu_texte" TEXT NOT NULL,
    "url_video" TEXT NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "formations_domaine_idx" ON "formations"("domaine");

-- CreateIndex
CREATE INDEX "formations_stade_cible_idx" ON "formations"("stade_cible");

-- CreateIndex
CREATE INDEX "formations_type_cible_idx" ON "formations"("type_cible");

-- CreateIndex
CREATE INDEX "formations_auteur_id_idx" ON "formations"("auteur_id");

-- CreateIndex
CREATE INDEX "lessons_formation_id_idx" ON "lessons"("formation_id");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_formation_id_ordre_key" ON "lessons"("formation_id", "ordre");

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
