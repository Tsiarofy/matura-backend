-- CreateEnum
CREATE TYPE "Role" AS ENUM ('port', 'inv', 'mentor', 'admin');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" "Role" DEFAULT 'port',
    "region" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projet" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "problematique" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "secteur" TEXT NOT NULL,
    "contexte" TEXT NOT NULL,
    "objectifs" TEXT NOT NULL,
    "utilisateurId" INTEGER NOT NULL,

    CONSTRAINT "projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation" (
    "id" SERIAL NOT NULL,
    "projetId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "note" INTEGER NOT NULL,

    CONSTRAINT "evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage1" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "contenu" JSONB NOT NULL,

    CONSTRAINT "stage1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation1" (
    "id" SERIAL NOT NULL,
    "force" TEXT NOT NULL,
    "faiblesse" TEXT NOT NULL,
    "remarque" TEXT,
    "valide" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "stage1Id" INTEGER,

    CONSTRAINT "evaluation1_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- AddForeignKey
ALTER TABLE "projet" ADD CONSTRAINT "projet_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation1" ADD CONSTRAINT "evaluation1_stage1Id_fkey" FOREIGN KEY ("stage1Id") REFERENCES "stage1"("id") ON DELETE SET NULL ON UPDATE CASCADE;
