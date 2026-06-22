import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerOffreDto } from './dto/creer-offre.dto';
import { PostulerDto } from './dto/postuler.dto';
import {
  StatutOffre,
  StatutCandidature,
  FiltresFinancement,
} from '@matura/shared';
import { take } from 'rxjs';

const BRL_MINIMUM_POSTULATION = 6;

@Injectable()
export class FinancementService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Select investisseur réutilisable ────────────────────────────────────────
  private readonly investisseurSelect = {
    id: true,
    prenom: true,
    nom: true,
    url_avatar: true,
    profil: true,
  };

  // ─── Créer une offre ─────────────────────────────────────────────────────────

  async creerOffre(investisseurId: string, dto: CreerOffreDto) {
    return this.prisma.offreFinancement.create({
      data: {
        investisseurId,
        titre: dto.titre,
        description: dto.description,
        typeFinancement: dto.typeFinancement,
        stadeCible: dto.stadeCible,
        montantMin: dto.montantMin,
        montantMax: dto.montantMax,
        devise: dto.devise ?? 'MGA',
        secteurs: dto.secteurs ?? [],
        regions: dto.regions ?? [],
        dateCloture: dto.dateCloture ? new Date(dto.dateCloture) : undefined,
        statut: StatutOffre.OUVERTE,
      },
    });
  }

  // ─── Lister les offres (côté entrepreneur) ───────────────────────────────────

  async listerOffres(filtres: FiltresFinancement) {
    const {
      page = 1, limit = 20, recherche, typeFinancement,
      secteur, region, montantMin, montantMax, statut, stadeCible,
    } = filtres
    // {
    //   page:Number(filtres.page),
    //   limit:Number(filtres.limit),
    //   recherche:filtres.recherche,
    //   typeFinancement:filtres.typeFinancement,
    //   secteur:Filtre,
    //    region, montantMin, montantMax, statut, stadeCible,
    // } as FiltresFinancement

    const where: any = { statut: statut ?? StatutOffre.OUVERTE };

    if (recherche) {
      where.OR = [
        { titre: { contains: recherche, mode: 'insensitive' } },
        { description: { contains: recherche, mode: 'insensitive' } },
      ];
    }


    if (typeFinancement) where.typeFinancement = typeFinancement;
    // Prisma array : has pour tester si un élément est dans le tableau
    if (secteur) where.secteurs = { has: secteur };
    if (region) where.regions = { has: region };
    // Filtre montant : on cherche les offres dont la fourchette chevauche
    if (montantMin !== undefined) where.montantMax = { gte: montantMin };
    if (montantMax !== undefined) where.montantMin = { lte: montantMax };
    // stadeCible dans le filtre = BRL de l'entrepreneur
    // → on lui montre les offres dont stadeCible <= son BRL
    if (stadeCible !== undefined) where.stadeCible = { lte: stadeCible };

  console.log("----LOGGER-------")
  console.log(typeof(limit),limit);
    const [data, total] = await Promise.all([
      this.prisma.offreFinancement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          investisseur: { select: this.investisseurSelect },
          _count: { select: { candidatures: true } },
        },
      }),
      this.prisma.offreFinancement.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Détail d'une offre ───────────────────────────────────────────────────────

  async getOffreById(id: string) {
    const offre = await this.prisma.offreFinancement.findUnique({
      where: { id },
      include: {
        investisseur: { select: this.investisseurSelect },
        _count: { select: { candidatures: true } },
      },
    });
    if (!offre) throw new NotFoundException('Offre de financement introuvable');
    return offre;
  }

  // ─── Mes offres (investisseur) ────────────────────────────────────────────────

  async mesOffres(investisseurId: string) {
    return this.prisma.offreFinancement.findMany({
      where: { investisseurId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { candidatures: true } },
      },
    });
  }

  // ─── Projets éligibles pour une offre ────────────────────────────────────────
  // BRL éligible = max(BRL_MINIMUM_POSTULATION=6, offre.stadeCible)

  async getProjetsEligibles(entrepreneurId: string, offreId: string) {
    const offre = await this.getOffreById(offreId);
    const brlMinimum = Math.max(BRL_MINIMUM_POSTULATION, offre.stadeCible);

    const projets = await this.prisma.projet.findMany({
      where: {
        proprietaire_id: entrepreneurId,
        brl_actuel: { gte: brlMinimum },
        statut: { not: 'ARCHIVE' },
      },
      include: {
        // Vérifier si déjà candidaté à cette offre
        candidatures: {
          where: { offreId },
          select: { id: true },
        },
        equipe: { select: { id: true } },
      },
    });

    return projets.map((p) => ({
      id: p.id,
      nom: p.titre,
      description: p.description,
      brl: p.brl_actuel,
      secteur: p.secteur,
      region: p.region,
      statut: p.statut,
      dateCreation: p.cree_le,
      membreEquipe: p.equipe.length,
      dejaCandidaté: p.candidatures.length > 0,
    }));
  }

  // ─── Postuler ─────────────────────────────────────────────────────────────────

  async postuler(entrepreneurId: string, offreId: string, dto: PostulerDto) {
    const offre = await this.getOffreById(offreId);

    if (offre.statut !== StatutOffre.OUVERTE && offre.statut !== StatutOffre.EN_COURS) {
      throw new BadRequestException("Cette offre n'accepte plus de candidatures");
    }

    const projet = await this.prisma.projet.findUnique({
      where: { id: dto.projetId },
    });
    if (!projet) throw new NotFoundException('Projet introuvable');
    if (projet.proprietaire_id !== entrepreneurId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }

    const brlMinimum = Math.max(BRL_MINIMUM_POSTULATION, offre.stadeCible);
    if (projet.brl_actuel < brlMinimum) {
      throw new BadRequestException(
        `BRL insuffisant : requis ${brlMinimum}, actuel ${projet.brl_actuel}`,
      );
    }

    // Doublon — couvert par @@unique mais message explicite
    const existant = await this.prisma.candidature.findFirst({
      where: { projetId: dto.projetId, offreId },
    });
    if (existant) {
      throw new BadRequestException('Ce projet a déjà postulé à cette offre');
    }

    return this.prisma.candidature.create({
      data: {
        offreId,
        projetId: dto.projetId,
        entrepreneurId,
        messageMotivation: dto.messageMotivation,
        statut: StatutCandidature.EN_ATTENTE,
        brlAuMoment: projet.brl_actuel, // snapshot BRL
      },
    });
  }

  // ─── Mes candidatures (entrepreneur) ─────────────────────────────────────────

  async mesCandidatures(entrepreneurId: string) {
    return this.prisma.candidature.findMany({
      where: { entrepreneurId },
      orderBy: { createdAt: 'desc' },
      include: {
        offre: {
          include: {
            investisseur: { select: this.investisseurSelect },
          },
        },
        projet: {
          select: {
            id: true,
            titre: true,
            brl_actuel: true,
          },
        },
      },
    });
  }

  // ─── Candidatures reçues (investisseur) ──────────────────────────────────────

  async candidaturesRecues(investisseurId: string, offreId?: string) {
    const where: any = { offre: { investisseurId } };
    if (offreId) where.offreId = offreId;

    return this.prisma.candidature.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        projet: {
          include: {
            proprietaire: {
              select: { id: true, prenom: true, nom: true },
            },
            equipe: { select: { id: true } },
            // Données stades pour l'affichage investisseur
            stades: {
              select: {
                type: true,
                statut: true,
                donnees: true,
                score_auto: true,
              },
            },
            score: true,
            finances: true,
          },
        },
        offre: {
          select: { id: true, titre: true, stadeCible: true },
        },
      },
    });
  }

  // ─── Changer statut candidature ───────────────────────────────────────────────

  async changerStatutCandidature(
    investisseurId: string,
    candidatureId: string,
    statut: StatutCandidature,
  ) {
    const candidature = await this.prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: { offre: true },
    });
    if (!candidature) throw new NotFoundException('Candidature introuvable');
    if (candidature.offre.investisseurId !== investisseurId) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.prisma.candidature.update({
      where: { id: candidatureId },
      data: { statut },
    });
  }

  // ─── PROJETS VISIBLES AUX INVESTISSEURS ──────────────────────────────────────
  // Filtre strict : brl_actuel >= 6 ET score_global >= 65 ET est_public = true.
  // Les trois conditions sont obligatoires — aucune exception.

  async getProjetsInvestisseurs(params: {
    domaine?: string; score_min?: number; region?: string; page?: number; limite?: number
  }) {
    const page      = params.page ?? 1
    const limite    = Math.min(params.limite ?? 20, 100)
    const skip      = (page - 1) * limite
    const score_min = params.score_min ?? 65

    const where: any = {
      est_public: true,
      brl_actuel: { gte: 6 },
      score: { score_global: { gte: score_min } },
    }
    if (params.domaine) where.domaine = params.domaine
    if (params.region)  where.region  = params.region

    const [projets, total] = await Promise.all([
      this.prisma.projet.findMany({
        where,
        skip,
        take: limite,
        orderBy: { maj_le: 'desc' },
        include: {
          score: true,
          mentor: { select: { prenom: true, nom: true } },
          stades: { select: { type: true, donnees: true } },
        },
      }),
      this.prisma.projet.count({ where }),
    ])

    return {
      projets: projets.map((p) => {
        const donnees7 = p.stades.find((s) => s.type === 'STADE_7_LANCEMENT')
          ?.donnees as Record<string, unknown> | undefined
        return {
          id: p.id,
          titre: p.titre,
          domaine: p.domaine,
          region: p.region,
          brl_actuel: p.brl_actuel,
          score: p.score
            ? {
                score_global: p.score.score_global,
                score_innovation: p.score.score_innovation,
                score_marche: p.score.score_marche,
                score_equipe: p.score.score_equipe,
                score_finance: p.score.score_finance,
                score_execution: p.score.score_execution,
              }
            : null,
          mentor: p.mentor ? { prenom_nom: `${p.mentor.prenom} ${p.mentor.nom}` } : null,
          traction: donnees7 ?? null,
        }
      }),
      total,
      page,
      pages: Math.ceil(total / limite),
    }
  }

  // ─── FICHE INVESTISSEUR D'UN PROJET (12 dimensions) ─────────────────────────
  // Agrège tous les stades (1→7) en une réponse structurée par dimension.

  async getFicheInvestisseur(projetId: string) {
    const projet = (await this.prisma.projet.findUnique({
      where: { id: projetId },
      include: {
        score: true,
        finances: true,
        equipe: true,
        proprietaire: { select: { prenom: true, nom: true, url_avatar: true, profil: true } },
        mentor: { select: { prenom: true, nom: true, evaluations: { select: { note: true } } } },
        stades: {
          select: {
            type: true,
            donnees: true,
            documents: { select: { type_fichier: true, url: true, nom: true } },
          },
        },
      },
    })) as any;
    if (!projet) throw new NotFoundException('PROJET_INTROUVABLE')
    if (!projet.est_public) throw new ForbiddenException('PROJET_NON_PUBLIC')

    // Extraire les données par stade
    const stade = (type: string) =>
      projet.stades.find((s) => s.type === type)?.donnees as Record<string, any> | undefined

    const d1 = stade('STADE_1_EMERGENCE')
    const d2 = stade('STADE_2_IDEATION')
    const d3 = stade('STADE_3_MARCHE')
    const d4 = stade('STADE_4_BMC')
    const d5 = stade('STADE_5_FAISABILITE')
    const d6 = stade('STADE_6_PROTOTYPE')
    const d7 = stade('STADE_7_LANCEMENT')

    return {
      // ── 1. Identité ────────────────────────────────────────────────────────────
      identite: {
        id:              projet.id,
        titre:           projet.titre,
        domaine:         projet.domaine,
        region:          projet.region,
        brl_actuel:      projet.brl_actuel,
        date_creation:   projet.cree_le?.toISOString() ?? null,
        resume_executif: (d7?.resume_executif?.description_courte as string) ?? (d7?.resume_executif?.phrase_accroche as string) ?? null,
        proprietaire_id: projet.proprietaire_id,
      },

      // ── 2. Équipe ──────────────────────────────────────────────────────────────
      equipe: {
        fondateur: {
          prenom_nom: `${projet.proprietaire.prenom} ${projet.proprietaire.nom}`,
          avatar_url: projet.proprietaire.url_avatar ?? null,
          bio:        (projet.proprietaire.profil as any)?.bio ?? null,
        },
        membres: projet.equipe.map((m) => ({
          prenom_nom:  m.prenom_nom,
          role_projet: m.role_projet,
          disciplines: m.disciplines,
        })),
        mentor: projet.mentor
          ? {
              prenom_nom:     `${projet.mentor.prenom} ${projet.mentor.nom}`,
              nb_evaluations: projet.mentor.evaluations.length,
              note_moyenne:   projet.mentor.evaluations.length > 0
                ? projet.mentor.evaluations.reduce((s, e) => s + e.note, 0) / projet.mentor.evaluations.length
                : null,
            }
          : null,
      },

      // ── 3. Problème & opportunité (Stade 1) ───────────────────────────────────
      probleme: {
        probleme_identifie: (d1?.enonce_probleme as string) ?? null,
        cible:              (d1?.profil_affecte?.description as string) ?? null,
        preuve:             (d1?.observations_terrain?.verbatims as string[])?.filter(Boolean).join(' ; ') ?? null,
        opportunite:        (d1?.opportunite as string) ?? null,
      },

      // ── 4. Solution (Stade 2 Lean Canvas + Stade 6 MVP) ──────────────────────
      solution: {
        description:        (d2?.bloc_proposition_valeur?.phrase_principale as string) ?? null,
        stade_developpement: (d6?.mvp?.type as string) ?? null,
        avantage_cle:       (d2?.bloc_avantage_unique?.description as string) ?? null,
        propriete_intellectuelle: (d5?.propriete_intellectuelle as string) ?? null,
      },

      // ── 5. Modèle économique (Stade 4 BMC) ───────────────────────────────────
      modele_economique: {
        monetisation:       (d4?.sources_revenus as unknown) ?? (d2?.bloc_sources_revenus as unknown) ?? null,
        canaux_distribution:(d2?.bloc_canaux as unknown) ?? null,
        partenaires_cles:   (d4?.partenaires_cles as unknown) ?? null,
        structure_couts:    (d4?.structure_couts as unknown) ?? null,
        cac:                (d6?.cac as number) ?? null,
        ltv:                (d6?.ltv as number) ?? null,
      },

      // ── 6. Marché (Stade 3) ───────────────────────────────────────────────────
      marche: {
        tam:            (d3?.tam as number) ?? (d3?.taille_marche?.tam?.valeur as number) ?? null,
        sam:            (d3?.sam as number) ?? (d3?.taille_marche?.sam?.valeur as number) ?? null,
        som:            (d3?.som as number) ?? (d3?.taille_marche?.som?.valeur as number) ?? null,
        concurrents:    (d3?.concurrents as unknown[]) ?? [],
        positionnement: (d3?.positionnement as string) ?? (d3?.positionnement_prix?.modele_prix as string) ?? null,
        tendances:      (d3?.tendances as string) ?? null,
      },

      // ── 7. Traction & validation (Stade 6 + Stade 7) ─────────────────────────
      traction: {
        nb_clients:           (d6?.metriques_usage?.total_utilisateurs_atteints as number) ?? null,
        clients_payants:      (d6?.metriques_usage?.clients_payants as number) ?? null,
        revenus_generes:      (d6?.metriques_usage?.revenus_generes_ar as number) ?? null,
        revenus_generes_ar:   (d6?.metriques_usage?.revenus_generes_ar as number) ?? null,
        score_nps:            (d6?.metriques_usage?.score_nps as number) ?? null,
        taux_retention:       (d6?.metriques_usage?.taux_retention_pct as number) ?? null,
        taux_retention_pct:   (d6?.metriques_usage?.taux_retention_pct as number) ?? null,
        partenariats:         (d7?.partenariats_signes as string[]) ?? [],
        kpis_cles:            (d7?.kpis as unknown) ?? null,
      },

      // ── 8. Stratégie de croissance (Stade 2 + Stade 5) ───────────────────────
      croissance: {
        go_to_market:  (d2?.strategie_go_to_market as string) ?? null,
        roadmap:       (d5?.jalons as unknown[]) ?? [],
        objectifs_12m: (d7?.objectifs_12m as string) ?? null,
        objectifs_24m: (d7?.objectifs_24m as string) ?? null,
      },

      // ── 9. Besoins financiers (Stade 7) ──────────────────────────────────────
      besoins_financement: {
        montant_recherche:    (d7?.demande_financement?.montant_ar as number)
                           ?? (d5?.finances?.besoin_financement_ar as number) ?? null,
        type_financement:     (d7?.demande_financement?.type as string)
                           ?? (d5?.finances?.type_financement as string) ?? null,
        usage_des_fonds:      (d7?.demande_financement?.utilisation as unknown) ?? null,
      },
      demande_financement: {
        montant_ar: (d7?.demande_financement?.montant_ar as number)
                 ?? (d5?.finances?.besoin_financement_ar as number) ?? null,
        type:       (d7?.demande_financement?.type as string)
                 ?? (d5?.finances?.type_financement as string) ?? null,
      },

      // ── 10. Projections financières (Stade 5 moteur financier) ───────────────
      projections: projet.finances
        ? {
            point_mort_unites: projet.finances.point_mort_unites,
            ca_previsionnel:   projet.finances.ca_previsionnel,
            roi:               projet.finances.roi,
            bfr:               (d5?.bfr as number) ?? null,
            hypotheses:        (d5?.hypotheses_cles as string) ?? null,
          }
        : null,
      finances: projet.finances
        ? {
            point_mort_unites: projet.finances.point_mort_unites,
            ca_previsionnel:   projet.finances.ca_previsionnel as any,
            roi:               projet.finances.roi,
          }
        : null,

      // ── 11. Impact (Stade 7) ──────────────────────────────────────────────────
      impact: {
        impact_social:    (d7?.impact_social as string) ?? null,
        impact_env:       (d7?.impact_environnemental as string) ?? null,
        emplois_crees:    (d7?.emplois_crees as number) ?? null,
        alignement_odd:   (d7?.objectifs_developpement_durable as string[]) ?? [],
      },

      // ── 12. Risques (Stade 7 si disponible) ───────────────────────────────────
      risques: (d7?.matrice_risques as unknown[]) ?? null,

      // ── Scores MCDA ───────────────────────────────────────────────────────────
      score: projet.score
        ? {
            score_global:     projet.score.score_global,
            score_innovation: projet.score.score_innovation,
            score_marche:     projet.score.score_marche,
            score_equipe:     projet.score.score_equipe,
            score_finance:    projet.score.score_finance,
            score_execution:  projet.score.score_execution,
          }
        : null,

      // ── Documents (preuves uploadées) ─────────────────────────────────────────
      documents: (projet.stades || []).flatMap((s: any) =>
         (s.documents || []).map((d: any) => ({
           type: d.type_fichier, nom: d.nom, url: d.url,
         }))
      ),
    }
  }
}
