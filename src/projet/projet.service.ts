import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreationProjetDto, ProjetResume, ProjetDetail,TypeCible } from '@matura/shared'
import { Prisma, StatutProjet, StatutStade, TypeStade } from '@prisma/client'
import { log } from 'console'

@Injectable()
export class ProjetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée un nouveau projet avec initialisation automatique :
   * - 7 stades (STADE_1 = DEBLOQUE, autres = VERROUILLE)
   * - ScoreProjet (tous scores à 0)
   * - FinancesProjet (vide)
   * - brl_actuel = 0
   * - statut = BROUILLON
   */
  async creerProjet(
    dto: CreationProjetDto,
    proprietaireId: string,
  ): Promise<ProjetDetail|any> {
    // Créer le projet avec les 7 stades et le score en une seule transaction
      // console.log("#######################################################")
      // console.log(proprietaireId);  
    const projet = await this.prisma.$transaction(async (tx) => {
      // 1. Créer le projet

      const nouveauProjet = await tx.projet.create({
        data: {
          titre: dto.titre,
          description: dto.description,
          domaine: dto.domaine,
          secteur: dto.secteur,
          region: dto.region,
          type_cible: dto.type_cible,
          statut: StatutProjet.BROUILLON,
          brl_actuel: 0,
          est_public: false,
          proprietaire_id: proprietaireId,
        },
      })

      // 2. Initialiser les 7 stades
      const stadesData: Prisma.StadeCreateManyInput[] = [
        {
          projet_id: nouveauProjet.id,
          type: TypeStade.STADE_1_EMERGENCE,
          statut: StatutStade.DEBLOQUE, // Stade 1 débloqué d'office
          donnees: {},
          version: 1,
        },
        {
          projet_id: nouveauProjet.id,
          type: TypeStade.STADE_2_IDEATION,
          statut: StatutStade.VERROUILLE,
          donnees: {},
          version: 1,
        },
        {
          projet_id: nouveauProjet.id,
          type: TypeStade.STADE_3_MARCHE,
          statut: StatutStade.VERROUILLE,
          donnees: {},
          version: 1,
        },
        {
          projet_id: nouveauProjet.id,
          type: TypeStade.STADE_4_BMC,
          statut: StatutStade.VERROUILLE,
          donnees: {},
          version: 1,
        },
        {
          projet_id: nouveauProjet.id,
          type: TypeStade.STADE_5_FAISABILITE,
          statut: StatutStade.VERROUILLE,
          donnees: {},
          version: 1,
        },
        {
          projet_id: nouveauProjet.id,
          type: TypeStade.STADE_6_PROTOTYPE,
          statut: StatutStade.VERROUILLE,
          donnees: {},
          version: 1,
        },
        {
          projet_id: nouveauProjet.id,
          type: TypeStade.STADE_7_LANCEMENT,
          statut: StatutStade.VERROUILLE,
          donnees: {},
          version: 1,
        },
      ]

      await tx.stade.createMany({ data: stadesData })

      // 3. Initialiser le score MCDA (tous à 0)
      await tx.scoreProjet.create({
        data: {
          projet_id: nouveauProjet.id,
          score_stade_1: 0,
          score_stade_2: 0,
          score_stade_3: 0,
          score_stade_4: 0,
          score_stade_5: 0,
          score_stade_6: 0,
          score_stade_7: 0,
          score_global: 0,
          score_innovation: 0,
          score_marche: 0,
          score_equipe: 0,
          score_finance: 0,
          score_execution: 0,
        },
      })

      return nouveauProjet
    })

    // 4. Retourner le projet complet avec les stades
    return this.getProjetDetail(projet.id, proprietaireId)
  }

  /**
   * Liste les projets de l'entrepreneur connecté
   * Avec pagination et filtres optionnels
   */
  async getMesProjets(
    proprietaireId: string,
    filters?: {
      statut?: StatutProjet
      page?: number
      limite?: number
    },
  ): Promise<{
    projets: ProjetResume[]
    total: number
    page: number
    pages: number
  }> {
    const page = filters?.page || 1
    const limite = Math.min(filters?.limite || 20, 100)
    const skip = (page - 1) * limite

    const where: Prisma.ProjetWhereInput = {
      proprietaire_id: proprietaireId,
      ...(filters?.statut && { statut: filters.statut }),
    }

    const [projets, total] = await Promise.all([
      this.prisma.projet.findMany({
        where,
        skip,
        take: limite,
        orderBy: { maj_le: 'desc' },
        include: {
          mentor: {
            select: { id: true, prenom: true, nom: true,url_avatar: true },
          },
          stades: {
            select: {
              type: true,
              statut: true,
              score_auto: true,
              donnees: true,
            },
          },
          score: {
            select: { score_global: true },
          },
        },
      }),
      this.prisma.projet.count({ where }),
    ])
    // console.log(projets[0].);
    // Mapper vers ProjetResume
    const projetsResume: ProjetResume[] = projets.map((p) => {
      // Trouver le stade actif (le premier non VERROUILLE en ordre)
      const stadeActif = p.stades.find(
        (s) => s.statut !== StatutStade.VERROUILLE,
      )

      // Calculer numero et completion_pct du stade actif
      let stadeActifData: any = null
      if (stadeActif) {
        const numero = this.getNumeroFromType(stadeActif.type)
        const completion_pct = this.calculerCompletionStade(stadeActif, numero)

        stadeActifData = {
          type: stadeActif.type,
          numero,
          statut: stadeActif.statut,
          completion_pct,
        }
      }
      // console.log(p.)

      return {
        id: p.id,
        titre: p.titre,
        domaine: p.domaine,
        secteur: p.secteur,
        region: p.region,
        type_cible: p.type_cible as TypeCible,
        statut: p.statut,
        brl_actuel: p.brl_actuel,
        est_public: p.est_public,
        cree_le: p.cree_le.toISOString(),
        maj_le: p.maj_le.toISOString(),
        stade_actif: stadeActifData,
        mentor: p.mentor
          ? {
              id: p.mentor.id,
              prenom: p.mentor.prenom,
              nom: p.mentor.nom,
              url_avatar: p.mentor.url_avatar,
            }
          : null,
        score_global: p.score?.score_global ?? null,
      }
    })

    return {
      projets: projetsResume,
      total,
      page,
      pages: Math.ceil(total / limite),
    }
  }

  /**
   * Récupère le détail complet d'un projet
   * Accessible par : propriétaire, mentor assigné, admin
   */
  async getProjetDetail(
    projetId: string,
    userId: string,
    userRole?: string,
  ): Promise<ProjetDetail> {
    const projet = await this.prisma.projet.findUnique({
      where: { id: projetId },
      include: {
        proprietaire: {
          select: { id: true, prenom: true, nom: true },
        },
        mentor: {
          select: { id: true, prenom: true, nom: true,url_avatar: true },
        },
        stades: {
          select: {
            id: true,
            type: true,
            statut: true,
            score_auto: true,
            donnees: true,
            commence_le: true,
            soumis_le: true,
            valide_le: true,
          },
          orderBy: { type: 'asc' },
        },
        score: true, // On récupère tout l'objet score
      },
    })

    if (!projet) {
      throw new NotFoundException('Projet introuvable')
    }

    // Vérifier les droits d'accès
    const isProprietaire = projet.proprietaire_id === userId
    const isMentor = projet.mentor_id === userId
    const isAdmin = userRole === 'ADMIN'

    if (!isProprietaire && !isMentor && !isAdmin) {
      throw new ForbiddenException('Accès refusé à ce projet')
    }

    // Mapper vers ProjetDetail
    const stadeActif = projet.stades.find(
      (s) => s.statut !== StatutStade.VERROUILLE,
    )
    return {
      id: projet.id,
      titre: projet.titre,
      description: projet.description,
      domaine: projet.domaine,
      secteur: projet.secteur,
      region: projet.region,
      type_cible: projet.type_cible as TypeCible,
      statut: projet.statut,
      brl_actuel: projet.brl_actuel,
      est_public: projet.est_public,
      cree_le: projet.cree_le.toISOString(),
      maj_le: projet.maj_le.toISOString(),
      stade_actif: stadeActif
        ? {
            type: stadeActif.type,
            numero: this.getNumeroFromType(stadeActif.type),
            statut: stadeActif.statut,
            completion_pct: this.calculerCompletionStade(stadeActif, this.getNumeroFromType(stadeActif.type)),
          }
        : null,
      proprietaire: {
        id: projet.proprietaire.id,
        prenom: projet.proprietaire.prenom,
        nom: projet.proprietaire.nom,
      },
      mentor: projet.mentor
        ? {
            id: projet.mentor.id,
            prenom: projet.mentor.prenom,
            nom: projet.mentor.nom,
            url_avatar: projet.mentor.url_avatar,
          }
        : null,
      stades: projet.stades.map((s) => {
        const numero = this.getNumeroFromType(s.type)
        return {
          id: s.id,
          type: s.type,
          numero,
          statut: s.statut,
          score_auto: s.score_auto,
          completion_pct: this.calculerCompletionStade(s, numero),
          commence_le: s.commence_le?.toISOString() || null,
          soumis_le: s.soumis_le?.toISOString() || null,
          valide_le: s.valide_le?.toISOString() || null,
        }
      }),
      score_global: projet.score?.score_global ?? null,
      score: projet.score
        ? {
            score_global: projet.score.score_global,
            score_innovation: projet.score.score_innovation,
            score_marche: projet.score.score_marche,
            score_equipe: projet.score.score_equipe,
            score_finance: projet.score.score_finance,
            score_execution: projet.score.score_execution,
          }
        : null,
    }
  }

  /**
   * Helpers privés
   */
  private getNumeroFromType(type: TypeStade): number {
    const mapping: Record<TypeStade, number> = {
      STADE_1_EMERGENCE: 1,
      STADE_2_IDEATION: 2,
      STADE_3_MARCHE: 3,
      STADE_4_BMC: 4,
      STADE_5_FAISABILITE: 5,
      STADE_6_PROTOTYPE: 6,
      STADE_7_LANCEMENT: 7,
    }
    return mapping[type] || 0
  }

  /**
   * Calcule le pourcentage de complétude visuel d'un stade
   * Vérifie la présence des champs clés pour chaque stade
   * @param stade - Objet stade avec les données
   * @param numStade - Numéro du stade (1-7)
   * @returns Pourcentage de complétude (0-100)
   */
  private calculerCompletionStade(stade: any, numStade: number): number {
    // Définir les champs clés pour chaque stade
    const champsParStade: Record<number, string[]> = {
      1: ['enonce_probleme', 'profil_affecte', 'intensite_probleme', 'observations_terrain', 'solutions_existantes', 'contexte_geographique'],
      2: ['bloc_probleme', 'bloc_segments_clients', 'bloc_solution', 'bloc_proposition_valeur', 'bloc_canaux', 'bloc_sources_revenus', 'bloc_structure_couts'],
      3: ['taille_marche', 'enquete', 'concurrents', 'positionnement_prix', 'sources_marche'],
      4: ['evolution_lean_canvas', 'propositions_valeur', 'segments_clients', 'ressources_cles', 'activites_cles', 'partenaires_cles', 'structure_couts', 'sources_revenus'],
      5: ['disciplines_requises_projet', 'membres_equipe', 'finances', 'jalons'],
      6: ['mvp', 'retours_clients', 'metriques_usage', 'iterations'],
      7: ['resume_executif', 'demande_financement', 'contexte_investisseur'],
    }

    const champs = champsParStade[numStade] ?? []
    if (!champs.length) return 0

    const donnees = (stade?.donnees ?? {}) as Record<string, unknown>

    // Compter les champs remplis (non-null, non-empty, non-tableau vide)
    const remplis = champs.filter((c) => {
      const v = donnees[c]
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
    }).length

    return Math.round((remplis / champs.length) * 100)
  }
}
