# Matura — Backend

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="80" alt="NestJS Logo" />
</p>

<p align="center">
  API REST du projet <strong>Matura</strong> — plateforme de pré-incubation entrepreneuriale conçue pour les Malagasy.
</p>

<p align="center">
  <a href="https://github.com/Tsiarofy/matura-backend/actions/workflows/deploy.yml">
  </a>
  <img src="https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

## 🪧 À propos

**Matura** est une application web de pré-incubation de projets entrepreneuriaux, conçue spécialement pour les Malagasy. Elle met en relation directement les porteurs de projet avec des **mentors** et des **investisseurs**, tout en encadrant le porteur de projet pendant son processus de maturation.

 Le projet est découpé en **3 dépôts distincts** , et ceci contient uniquement la partie **backend** (API REST):

| Dépôt | Description |
|-------|-------------|
| [`matura-backend`](https://github.com/Tsiarofy/matura-backend) | **Ce dépôt** — API NestJS + Prisma |
| [`matura-frontend`](https://github.com/Tsiarofy/matura-frontend) | Interface React + Vite + TailwindCSS |
| [`shared`](https://github.com/Tsiarofy/matura-shared) | Package `@matura/shared` — types & schémas Zod partagés |

---

## 📦 Prérequis

Avant de démarrer, assurez-vous d'avoir installé :

| Outil | Version recommandée | Lien |
|-------|---------------------|------|
| [Node.js](https://nodejs.org/) | ≥ 20.x | https://nodejs.org/ |
| [pnpm](https://pnpm.io/) | ≥ 9.x | https://pnpm.io/installation |
| [PostgreSQL](https://www.postgresql.org/) | ≥ 16 | https://www.postgresql.org/download/ |
| [Git](https://git-scm.com/) | toute version récente | https://git-scm.com/ |

---

## 🚀 Installation

### 1. Cloner les 3 dépôts côte à côte

Le package `@matura/shared` est référencé via un lien local (`link:../shared`), les dépôts doivent donc être dans le **même dossier parent**.

```bash
# Créer le dossier parent
mkdir maturaproj && cd maturaproj

# Cloner les 3 dépôts
git clone https://github.com/Tsiarofy/matura-shared.git shared
git clone https://github.com/Tsiarofy/matura-backend.git matura-backend
git clone https://github.com/Tsiarofy/matura-frontend.git matura-frontend
```

### 2. Construire le package partagé

```bash
cd shared
pnpm install
pnpm run build
```

### 3. Installer les dépendances du backend

```bash
cd ../matura-backend
pnpm install
```

### 4. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du dépôt backend :

```dotenv
# Base de données PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/matura?schema=public"

# Secrets JWT
JWT_ACCESS_SECRET="votre_secret_access"
JWT_REFRESH_SECRET="votre_secret_refresh"

# LiveKit (visioconférence)
LIVEKIT_API_KEY="votre_livekit_api_key"
LIVEKIT_API_SECRET="votre_livekit_api_secret"
LIVEKIT_WS_URL="wss://votre-instance.livekit.cloud"

# Google Cloud (IA Vertex / Gemini)
GOOGLE_APPLICATION_CREDENTIALS="/chemin/vers/credentials.json"
GOOGLE_CLOUD_PROJECT="votre-gcp-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"

# Cookies
COOKIE_SECURE="false"  # true en production (HTTPS)

# Port d'écoute (optionnel, défaut : 3001)
PORT=3001
```

### 5. Initialiser la base de données

```bash
# Appliquer les migrations Prisma
pnpm exec prisma migrate deploy

# Générer le client Prisma
pnpm exec prisma generate

# (Optionnel) Remplir avec des données de seed
pnpm exec prisma db seed
```

---

## 🛠️ Utilisation

### Mode développement (watch)

```bash
pnpm run start
```

L'API sera disponible sur `http://localhost:3001/api`.

### Mode debug

```bash
pnpm run start:debug
```

### Build de production

```bash
pnpm run build
pnpm run start:prod
```

### Linter & Formatage

```bash
# Lint automatique avec correction
pnpm run lint

# Formatage avec Prettier
pnpm run format
```

### Prisma Studio (interface GUI pour la BDD)

```bash
pnpm exec prisma studio
```

### Créer un compte administrateur

```bash
npx tsx create_admin.ts
```

---

## 🤝 Contribution

### Branches

| Branche | Rôle |
|---------|------|
| `main` | Code stable / développement |
| `server` | Déclencheur du déploiement automatique en production |

### Flux de contribution

```bash
# 1. Créer une branche de fonctionnalité depuis main
git checkout main
git pull origin main
git checkout -b feat/nom-de-la-feature

# 2. Développer & committer
git add .
git commit -m "feat: description de la fonctionnalité"

# 3. Pousser et ouvrir une Pull Request vers main
git push origin feat/nom-de-la-feature
```

### Convention de commits

Ce projet suit la convention [Conventional Commits](https://www.conventionalcommits.org/fr/) :

```
feat:     nouvelle fonctionnalité
fix:      correction de bug
```

### Déclencher un déploiement

Le déploiement en production se déclenche automatiquement lors d'un push sur la branche `server` par l'utilisation de Github action :

```bash
git checkout server
git merge main
git push origin server
```

---

## 🏗️ Construit avec

### Langages & Frameworks

| Technologie | Rôle | Documentation |
|-------------|------|---------------|
| [TypeScript](https://www.typescriptlang.org/) 5 | Langage principal (typage statique) | https://www.typescriptlang.org/docs/ |
| [NestJS](https://nestjs.com/) 10 | Framework Node.js structuré (modules, DI, guards…) | https://docs.nestjs.com/ |
| [Prisma](https://www.prisma.io/) 6 | ORM — migrations, schéma et client PostgreSQL | https://www.prisma.io/docs/ |
| [PostgreSQL](https://www.postgresql.org/) 16 | Base de données relationnelle | https://www.postgresql.org/docs/ |
| [Zod](https://zod.dev/) | Validation & typage des schémas (partagé avec le frontend) | https://zod.dev/ |
| [Passport.js](https://www.passportjs.org/) + JWT | Authentification (access token + refresh token via cookies) | https://docs.nestjs.com/security/authentication |
| [LiveKit Server SDK](https://docs.livekit.io/server-sdk-js/) | Génération des tokens de visioconférence | https://docs.livekit.io/ |
| [Multer](https://github.com/expressjs/multer) | Gestion des uploads de fichiers (avatars, documents) | https://github.com/expressjs/multer |
| [class-validator](https://github.com/typestack/class-validator) | Validation des DTO avec les décorateurs NestJS | https://github.com/typestack/class-validator |
| [@matura/shared](https://github.com/Tsiarofy/matura-shared) | Types & schémas Zod partagés entre backend et frontend | — |

### Outils

#### CI / CD

| Outil | Rôle | Variables / Secrets |
|-------|------|---------------------|
| [GitHub Actions](https://docs.github.com/fr/actions) | Pipeline de déploiement automatique sur push `server` | — |
| [PM2](https://pm2.keymetrics.io/) | Gestionnaire de processus Node.js en production | — |

**Secrets GitHub requis** (à configurer dans `Settings → Secrets and variables → Actions`) :

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Clé SSH privée pour accéder au serveur GCP |
| `GCP_IP` | Adresse IP du serveur Google Cloud |
| `GCP_USER` | Nom d'utilisateur SSH du serveur |

#### Déploiement

| Outil | Rôle | Documentation |
|-------|------|---------------|
| [Google Cloud Platform (GCP)](https://cloud.google.com/) | Hébergement du serveur de production (VM) | https://cloud.google.com/docs |
| [Nginx](https://nginx.org/) | Reverse proxy — sert les fichiers statiques (`/uploads/`) et redirige vers NestJS | https://nginx.org/en/docs/ |
| [PM2](https://pm2.keymetrics.io/) | Démarrage automatique & redémarrage du processus Node.js | https://pm2.keymetrics.io/docs/ |
| [pnpm](https://pnpm.io/) | Gestionnaire de paquets rapide utilisé en CI et en production | https://pnpm.io/ |

**Flux de déploiement (`.github/workflows/deploy.yml`)** :

1. Création d'une archive `.tar.gz` des sources (`src/`, `prisma/`, configs)
2. Transfert via `scp` vers le serveur GCP
3. Sur le serveur : rebuild de `@matura/shared`, extraction, `pnpm install`, `prisma generate`, `pnpm build`
4. Redémarrage de l'application via `pm2 restart backend`
5. Healthcheck sur `GET /api/health`

---

## 📚 Documentation

- [NestJS — Documentation officielle](https://docs.nestjs.com/)
- [Prisma — Documentation officielle](https://www.prisma.io/docs/)
- [LiveKit — Documentation officielle](https://docs.livekit.io/)
- [Conventional Commits](https://www.conventionalcommits.org/fr/)
- [Gestion sémantique de version (SemVer)](https://semver.org/lang/fr/)

---

## 🏷️ Gestion des versions

Afin de maintenir un cycle de publication clair et de favoriser la rétrocompatibilité, la dénomination des versions suit la spécification décrite par la [Gestion sémantique de version](https://semver.org/lang/fr/).

Les versions disponibles ainsi que les journaux décrivant les changements apportés sont disponibles depuis [la page des Releases](https://github.com/Tsiarofy/matura-backend/releases).

---

## 📝 Licence

Licence MIT
