/*
  Warnings:

  - You are about to drop the `evaluation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `evaluation1` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stage1` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `utilisateur` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('ENTREPRENEUR', 'MENTOR', 'INVESTISSEUR', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatutCompte" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "SousTypeInvestisseur" AS ENUM ('ANGEL', 'BANQUE', 'ONG', 'FONDS_IMPACT', 'INCUBATEUR', 'ETAT', 'AUTRE');

-- CreateEnum
CREATE TYPE "DomainProjet" AS ENUM ('TECH', 'AGRICULTURE', 'COMMERCE', 'SERVICE', 'SOCIAL', 'INDUSTRIE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutProjet" AS ENUM ('BROUILLON', 'EN_COURS', 'EN_EVALUATION', 'VALIDE', 'DIPLOME', 'FINANCE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "TypeStade" AS ENUM ('STADE_1_EMERGENCE', 'STADE_2_IDEATION', 'STADE_3_MARCHE', 'STADE_4_BMC', 'STADE_5_FAISABILITE', 'STADE_6_PROTOTYPE', 'STADE_7_LANCEMENT');

-- CreateEnum
CREATE TYPE "StatutStade" AS ENUM ('VERROUILLE', 'DEBLOQUE', 'BROUILLON', 'SOUMIS', 'EN_REVISION', 'VALIDE');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('TECH', 'DESIGN', 'VENTE', 'FINANCE', 'JURIDIQUE', 'MARKETING', 'OPERATIONS', 'EXPERT_DOMAINE', 'COMMUNICATION');

-- CreateEnum
CREATE TYPE "TypeFinancementOffre" AS ENUM ('SUBVENTION', 'PRET_HONNEUR', 'CAPITAL', 'BILLET_CONVERTIBLE', 'INCUBATION', 'CONCOURS', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutCandidature" AS ENUM ('EN_ATTENTE', 'VU', 'INTERESSE', 'REFUSE', 'FINANCE');

-- CreateEnum
CREATE TYPE "TypeDecision" AS ENUM ('VALIDE', 'RENVOYE');

-- DropForeignKey
ALTER TABLE "evaluation" DROP CONSTRAINT "evaluation_projetId_fkey";

-- DropForeignKey
ALTER TABLE "evaluation1" DROP CONSTRAINT "evaluation1_stage1Id_fkey";

-- DropForeignKey
ALTER TABLE "projet" DROP CONSTRAINT "projet_utilisateurId_fkey";

-- DropTable
DROP TABLE "evaluation";

-- DropTable
DROP TABLE "evaluation1";

-- DropTable
DROP TABLE "projet";

-- DropTable
DROP TABLE "stage1";

-- DropTable
DROP TABLE "utilisateur";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL,
    "statut_compte" "StatutCompte" NOT NULL DEFAULT 'APPROUVE',
    "profil" JSONB,
    "url_avatar" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_refresh" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "utilisateur_id" TEXT NOT NULL,
    "expire_le" TIMESTAMP(3) NOT NULL,
    "invalide" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_refresh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projets" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domaine" "DomainProjet" NOT NULL,
    "secteur" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "type_cible" TEXT NOT NULL,
    "statut" "StatutProjet" NOT NULL DEFAULT 'BROUILLON',
    "brl_actuel" INTEGER NOT NULL DEFAULT 0,
    "est_public" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,
    "proprietaire_id" TEXT NOT NULL,
    "mentor_id" TEXT,

    CONSTRAINT "projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stades" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "type" "TypeStade" NOT NULL,
    "statut" "StatutStade" NOT NULL DEFAULT 'VERROUILLE',
    "donnees" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "historique" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "score_auto" DOUBLE PRECISION,
    "commence_le" TIMESTAMP(3),
    "soumis_le" TIMESTAMP(3),
    "valide_le" TIMESTAMP(3),
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "stade_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type_fichier" TEXT NOT NULL,
    "description" TEXT,
    "type_preuve" TEXT,
    "taille_octets" INTEGER,
    "uploade_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membres_equipe" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "utilisateur_id" TEXT,
    "prenom_nom" TEXT NOT NULL,
    "role_projet" TEXT NOT NULL,
    "disciplines" "Discipline"[],
    "annees_experience" INTEGER NOT NULL DEFAULT 0,
    "engagement" TEXT NOT NULL DEFAULT 'TEMPS_PLEIN',
    "est_fondateur" BOOLEAN NOT NULL DEFAULT false,
    "pourcentage_parts" DOUBLE PRECISION,
    "linkedin_url" TEXT,
    "ajoute_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membres_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "stade_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "note" DOUBLE PRECISION NOT NULL,
    "commentaire" TEXT NOT NULL,
    "criteres" JSONB NOT NULL,
    "decision" "TypeDecision" NOT NULL,
    "motif_renvoi" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores_projets" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "score_stade_1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_stade_2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_stade_3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_stade_4" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_stade_5" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_stade_6" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_stade_7" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_global" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_innovation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_marche" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_equipe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_finance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_execution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calcule_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finances_projets" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "charges_fixes" JSONB NOT NULL,
    "charges_variables" JSONB NOT NULL,
    "prix_vente_ar" DOUBLE PRECISION NOT NULL,
    "unites_projetees" JSONB NOT NULL,
    "investissement_initial" DOUBLE PRECISION NOT NULL,
    "besoin_financement" DOUBLE PRECISION NOT NULL,
    "type_financement" TEXT NOT NULL,
    "point_mort_unites" DOUBLE PRECISION,
    "point_mort_revenus" DOUBLE PRECISION,
    "ca_previsionnel" JSONB,
    "resultat_net" JSONB,
    "roi" DOUBLE PRECISION,
    "autonomie_mois" DOUBLE PRECISION,
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes_projets" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "stade_type" "TypeStade" NOT NULL,
    "code" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resolue" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offres_financement" (
    "id" TEXT NOT NULL,
    "investisseur_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type_financement" "TypeFinancementOffre" NOT NULL,
    "montant_min_ar" DOUBLE PRECISION,
    "montant_max_ar" DOUBLE PRECISION,
    "brl_minimal" INTEGER NOT NULL,
    "secteurs_cibles" TEXT[],
    "regions_cibles" TEXT[],
    "date_limite" TIMESTAMP(3),
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offres_financement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatures" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "offre_id" TEXT NOT NULL,
    "message" TEXT,
    "statut" "StatutCandidature" NOT NULL DEFAULT 'EN_ATTENTE',
    "brl_au_moment" INTEGER NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes_accompagnement" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "message" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_accompagnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donnees_geographiques" (
    "id" TEXT NOT NULL,
    "code_national" TEXT NOT NULL DEFAULT 'MG',
    "code_region" TEXT NOT NULL,
    "nom_region" TEXT NOT NULL,
    "code_district" TEXT NOT NULL,
    "nom_district" TEXT NOT NULL,
    "code_commune" TEXT NOT NULL,
    "nom_commune" TEXT NOT NULL,
    "code_fokontany" TEXT NOT NULL,
    "nom_fokontany" TEXT NOT NULL,
    "population_2018" INTEGER NOT NULL,
    "projection_2025" INTEGER NOT NULL,
    "niveau" TEXT NOT NULL,

    CONSTRAINT "donnees_geographiques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_refresh_token_key" ON "tokens_refresh"("token");

-- CreateIndex
CREATE UNIQUE INDEX "stades_projet_id_type_key" ON "stades"("projet_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "scores_projets_projet_id_key" ON "scores_projets"("projet_id");

-- CreateIndex
CREATE UNIQUE INDEX "finances_projets_projet_id_key" ON "finances_projets"("projet_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidatures_projet_id_offre_id_key" ON "candidatures"("projet_id", "offre_id");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_accompagnement_projet_id_mentor_id_key" ON "demandes_accompagnement"("projet_id", "mentor_id");

-- CreateIndex
CREATE UNIQUE INDEX "donnees_geographiques_code_fokontany_key" ON "donnees_geographiques"("code_fokontany");

-- CreateIndex
CREATE INDEX "donnees_geographiques_code_region_idx" ON "donnees_geographiques"("code_region");

-- CreateIndex
CREATE INDEX "donnees_geographiques_code_district_idx" ON "donnees_geographiques"("code_district");

-- CreateIndex
CREATE INDEX "donnees_geographiques_code_commune_idx" ON "donnees_geographiques"("code_commune");

-- CreateIndex
CREATE INDEX "donnees_geographiques_niveau_idx" ON "donnees_geographiques"("niveau");

-- AddForeignKey
ALTER TABLE "tokens_refresh" ADD CONSTRAINT "tokens_refresh_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_proprietaire_id_fkey" FOREIGN KEY ("proprietaire_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stades" ADD CONSTRAINT "stades_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_stade_id_fkey" FOREIGN KEY ("stade_id") REFERENCES "stades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membres_equipe" ADD CONSTRAINT "membres_equipe_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membres_equipe" ADD CONSTRAINT "membres_equipe_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_stade_id_fkey" FOREIGN KEY ("stade_id") REFERENCES "stades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores_projets" ADD CONSTRAINT "scores_projets_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances_projets" ADD CONSTRAINT "finances_projets_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes_projets" ADD CONSTRAINT "alertes_projets_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offres_financement" ADD CONSTRAINT "offres_financement_investisseur_id_fkey" FOREIGN KEY ("investisseur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_offre_id_fkey" FOREIGN KEY ("offre_id") REFERENCES "offres_financement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_accompagnement" ADD CONSTRAINT "demandes_accompagnement_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_accompagnement" ADD CONSTRAINT "demandes_accompagnement_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
