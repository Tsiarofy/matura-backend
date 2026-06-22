// src/stades/stades.service.ts
// ORCHESTRATEUR — Pattern Stratégie (ARCHITECTURE_TECHNIQUE_STADES.md)
//
// Ce service ne contient PLUS aucune logique de calcul métier.
// Il délègue :
//   • calculerMetriques() → Engine du stade concerné
//   • verifierGate()      → Engine du stade concerné
// Et conserve uniquement :
//   • CRUD Prisma (lecture, écriture, historique)
//   • Contrôle d'accès (propriétaire, mentor, admin)
//   • Orchestration des transitions de statut (BROUILLON → SOUMIS → VALIDE)
//   • Évaluation Mentor (evaluerStade, getEvaluations)

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TypeStade, StatutStade, StatutProjet } from '@prisma/client'
import { GateResult } from './types'

// Engines
import { Stade1Engine } from './engines/stade1.engine'
import { Stade2Engine } from './engines/stade2.engine'
import { Stade3Engine } from './engines/stade3.engine'
import { Stade4Engine } from './engines/stade4.engine'
import { Stade5Engine } from './engines/stade5.engine'
import { Stade6Engine } from './engines/stade6.engine'
import { Stade7Engine } from './engines/stade7.engine'

// Imports de types shared — garantissent le typage strict
import {
  DonneesStade1, MetriquesStade1,
  DonneesStade2, MetriquesStade2,
  DonneesStade3, MetriquesStade3,
  DonneesStade4, MetriquesStade4,
  DonneesStade5, MetriquesStade5,
  DonneesStade6, MetriquesStade6,
  DonneesStade7,
} from '@matura/shared'

// ─── MAPPING TYPE ↔ NUMÉRO ────────────────────────────────────────────────────

const NUM_TO_TYPE: Record<number, TypeStade> = {
  1: TypeStade.STADE_1_EMERGENCE,
  2: TypeStade.STADE_2_IDEATION,
  3: TypeStade.STADE_3_MARCHE,
  4: TypeStade.STADE_4_BMC,
  5: TypeStade.STADE_5_FAISABILITE,
  6: TypeStade.STADE_6_PROTOTYPE,
  7: TypeStade.STADE_7_LANCEMENT,
}

// ─── CALCUL COMPLÉTION (visuel, non bloquant) ────────────────────────────────
// Vérifie simplement si les clés principales sont présentes dans les données

function calculerCompletion(donnees: Record<string, unknown>, num: number): number {
  const champs: Record<number, string[]> = {
    1: ['enonce_probleme', 'profil_affecte', 'intensite_probleme', 'observations_terrain', 'solutions_existantes', 'contexte_geographique'],
    2: ['bloc_probleme', 'bloc_segments_clients', 'bloc_solution', 'bloc_proposition_valeur', 'bloc_canaux', 'bloc_sources_revenus', 'bloc_structure_couts'],
    3: ['taille_marche', 'enquete', 'concurrents', 'positionnement_prix', 'sources_marche'],
    4: ['evolution_lean_canvas', 'propositions_valeur', 'segments_clients', 'canaux', 'ressources_cles', 'activites_cles', 'partenaires_cles', 'structure_couts', 'sources_revenus'],
    5: ['disciplines_requises_projet', 'membres_equipe', 'finances', 'jalons'],
    6: ['mvp', 'retours_clients', 'metriques_usage', 'iterations'],
    7: ['resume_executif', 'demande_financement', 'contexte_investisseur'],
  }
  const liste = champs[num] ?? []
  if (!liste.length) return 0
  const remplis = liste.filter((c) => {
    const v = donnees[c]
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  }).length
  return Math.round((remplis / liste.length) * 100)
}

// ─── SERVICE ORCHESTRATEUR ────────────────────────────────────────────────────

@Injectable()
export class StadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s1: Stade1Engine,
    private readonly s2: Stade2Engine,
    private readonly s3: Stade3Engine,
    private readonly s4: Stade4Engine,
    private readonly s5: Stade5Engine,
    private readonly s6: Stade6Engine,
    private readonly s7: Stade7Engine,
  ) {}

  // ── Sélection du bon moteur selon le numéro de stade ──────────────────────
  // Note : le type de retour est intentionnellement permissif ici car l'orchestrateur
  // est agnostique des types spécifiques. La sécurité de type est garantie à l'intérieur
  // de chaque Engine (IStadeEngine<TDonnees, TMetriques>).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getEngine(num: number): any {
    const map: Record<number, unknown> = {
      1: this.s1,
      2: this.s2,
      3: this.s3,
      4: this.s4,
      5: this.s5,
      6: this.s6,
      7: this.s7,
    }
    const engine = map[num]
    if (!engine) throw new BadRequestException(`ENGINE_NON_IMPLEMENTE: Stade ${num}`)
    return engine
  }

  // ── Helper : Récupérer un stade avec vérification d'accès ─────────────────
  private async _getStade(projetId: string, numStade: number, userId: string, roleUser?: string) {
    const projet = await this.prisma.projet.findUnique({
      where: { id: projetId },
      include: { stades: { where: { type: NUM_TO_TYPE[numStade] } } },
    })
    if (!projet) throw new NotFoundException('PROJET_INTROUVABLE')

    const isProprietaire = projet.proprietaire_id === userId
    const isMentor = projet.mentor_id === userId
    const isAdmin = roleUser === 'ADMIN'

    if (!isProprietaire && !isMentor && !isAdmin) throw new ForbiddenException('NON_AUTORISE')

    const stade = projet.stades[0]
    if (!stade) throw new NotFoundException('STADE_INTROUVABLE')

    return { projet, stade, isProprietaire, isMentor }
  }

  // ─── GET STADE ──────────────────────────────────────────────────────────────

  async getStade(projetId: string, numStade: number, userId: string, roleUser?: string) {
    const { stade } = await this._getStade(projetId, numStade, userId, roleUser)
    const donnees = (stade.donnees ?? {}) as Record<string, unknown>
    const completion_pct = calculerCompletion(donnees, numStade)

    // Délégation au moteur pour les métriques
    const engine = this.getEngine(numStade)
    const metriques = await engine.calculerMetriques(donnees)

    const alertes = await this.prisma.alerteProjet.findMany({
      where: { projet_id: projetId, stade_type: NUM_TO_TYPE[numStade] },
    })
    if(numStade===1){
      console.log("- - - data stade1- - - - -")
      console.log(donnees)
    }

    return {
      id: stade.id,
      projet_id: projetId,
      type: stade.type,
      numero: numStade,
      statut: stade.statut,
      missions_completees: stade.missions_completees,
      donnees,
      metriques,
      version: stade.version,
      score_auto: stade.score_auto,
      completion_pct,
      alertes: alertes.map((a) => ({
        code: a.code,
        niveau: a.niveau,
        message: a.message,
        resolue: a.resolue,
      })),
      commence_le: stade.commence_le?.toISOString() ?? null,
      soumis_le: stade.soumis_le?.toISOString() ?? null,
      valide_le: stade.valide_le?.toISOString() ?? null,
      maj_le: stade.maj_le.toISOString(),
      calculs_informatifs: stade.calculs_informatifs,
    }
  }

  // ─── PUT STADE (enregistrement brouillon) ────────────────────────────────────

  async enregistrerStade(
    projetId: string,
    numStade: number,
    userId: string,
    payload: Record<string, unknown>,
  ) {

    // console.log("ARRIVER DANS LE SERVICES")
    const { stade, projet, isProprietaire } = await this._getStade(projetId, numStade, userId)

    if (!isProprietaire) throw new ForbiddenException('SEUL_LE_PROPRIETAIRE_PEUT_MODIFIER')

    const statuts_modifiables: StatutStade[] = [
      StatutStade.BROUILLON,
      StatutStade.EN_REVISION,
      StatutStade.DEBLOQUE,
    ]
    // console.log(statuts_modifiables)
    // console.log(stade.statut)
    // console.log(!statuts_modifiables.includes(stade.statut))
    if (!statuts_modifiables.includes(stade.statut)) {
      // console.log("ARRIVER DANS LE SERVICES2")
      throw new BadRequestException(`STADE_NON_MODIFIABLE: statut=${stade.statut}`)
    }

    const missionCount = await this.prisma.missionStade.count({
      where: { stade_id: stade.id },
    })
    if (missionCount > 0 && !stade.missions_completees) {
      throw new ForbiddenException('MISSIONS_NON_COMPLETEES')
    }

    // Extraction des calculs informatifs
    const calculs_informatifs = payload.calculs_informatifs;
    const donnees = { ...payload };
    delete donnees.calculs_informatifs;

    // Délégation des calculs et validation au moteur du stade
    const engine = this.getEngine(numStade)
    const metriques = await engine.calculerMetriques(donnees)
    const gate: GateResult = engine.verifierGate(donnees, metriques)
    const completion_pct = calculerCompletion(donnees, numStade)

    // Historique versionné
    const historique = Array.isArray(stade.historique) ? stade.historique : []
    const snapshot = {
      version: stade.version,
      donnees: stade.donnees,
      enregistre_le: new Date().toISOString(),
    }

    const nouveauStatut =
      stade.statut === StatutStade.DEBLOQUE ? StatutStade.BROUILLON : stade.statut
    const donneesAvecMetriques = { ...donnees, _metriques: metriques }

    await this.prisma.$transaction(async (tx) => {
      await tx.stade.update({
        where: { id: stade.id },
        data: {
          donnees: donneesAvecMetriques as never,
          statut: nouveauStatut,
          version: { increment: 1 },
          historique: [...historique, snapshot] as never[],
          commence_le: stade.commence_le ?? new Date(),
          ...(calculs_informatifs !== undefined && { calculs_informatifs: calculs_informatifs as any }),
        },
      })

      // Mise à jour des alertes actives
      await tx.alerteProjet.deleteMany({
        where: { projet_id: projetId, stade_type: NUM_TO_TYPE[numStade] },
      })
      if (gate.alertes_critiques.length > 0) {
        await tx.alerteProjet.createMany({
          data: gate.alertes_critiques.map((a) => ({
            projet_id: projetId,
            stade_type: NUM_TO_TYPE[numStade],
            code: a.code,
            niveau: a.niveau,
            message: a.message,
          })),
        })
      }

      // Transition projet BROUILLON → EN_COURS au premier enregistrement
      if (projet.statut === StatutProjet.BROUILLON) {
        await tx.projet.update({
          where: { id: projetId },
          data: { statut: StatutProjet.EN_COURS },
        })
      }

      // S5 spécifique : synchronisation table FinancesProjet
      if (numStade === 5) {
        const m = metriques as MetriquesStade5
        const finances = (donnees.finances ?? {}) as DonneesStade5['finances']
        if (m.point_mort_unites !== undefined) {
          const fData = {
            charges_fixes: finances.charges_fixes ?? [],
            charges_variables: finances.charges_variables ?? [],
            prix_vente_ar: finances.prix_vente_ar ?? 0,
            unites_projetees: finances.unites_projetees ?? { annee1: 0, annee2: 0, annee3: 0 },
            investissement_initial: finances.investissement_initial_ar ?? 0,
            besoin_financement: finances.besoin_financement_ar ?? 0,
            type_financement: finances.type_financement ?? 'MIXTE',
            point_mort_unites: m.point_mort_unites,
            point_mort_revenus: m.point_mort_revenus,
            ca_previsionnel: m.ca_previsionnel,
            resultat_net: m.resultat_net,
            roi: m.roi,
          }
          await tx.financesProjet.upsert({
            where: { projet_id: projetId },
            create: { projet_id: projetId, ...fData } as never,
            update: fData as never,
          })
        }
      }
    })

    return {
      statut: nouveauStatut,
      version: stade.version + 1,
      completion_pct,
      metriques,
      alertes: gate.alertes_critiques,
      maj_le: new Date().toISOString(),
    }
  }

  // ─── GET GATE (vérification) ─────────────────────────────────────────────────

  async verifierGateStade(projetId: string, numStade: number, userId: string): Promise<GateResult> {
    const { stade } = await this._getStade(projetId, numStade, userId)
    const donnees = (stade.donnees ?? {}) as Record<string, unknown>
    const engine = this.getEngine(numStade)
    const metriques = await engine.calculerMetriques(donnees)
    return engine.verifierGate(donnees, metriques) as GateResult
  }

  // ─── SOUMETTRE (ENTREPRENEUR → Mentor) ───────────────────────────────────────

  async soumettreStade(projetId: string, numStade: number, userId: string) {
    const { stade, projet, isProprietaire } = await this._getStade(projetId, numStade, userId)

    if (!isProprietaire) throw new ForbiddenException('SEUL_LE_PROPRIETAIRE_PEUT_SOUMETTRE')

    const statuts_soumissibles: StatutStade[] = [StatutStade.BROUILLON, StatutStade.EN_REVISION]
    if (!statuts_soumissibles.includes(stade.statut)) {
      throw new BadRequestException(`STATUT_INVALIDE: ${stade.statut}`)
    }

    // Vérif stade précédent validé (sauf S1)
    if (numStade > 1) {
      const prec = await this.prisma.stade.findFirst({
        where: { projet_id: projetId, type: NUM_TO_TYPE[numStade - 1] },
      })
      if (!prec || prec.statut!== StatutStade.VALIDE ) {
        //
        throw new UnprocessableEntityException({
          message: 'Le stade précédent doit être validé',
          code: 'STADE_PRECEDENT_NON_VALIDE',
        })
      }
    }

    // Vérification gate avant soumission
    const donnees = (stade.donnees ?? {}) as Record<string, unknown>
    const engine = this.getEngine(numStade)
    const metriques = await engine.calculerMetriques(donnees)
    const gate: GateResult = engine.verifierGate(donnees, metriques)

    if (!gate.peut_soumettre) {
      throw new UnprocessableEntityException({
        message: 'Impossible de soumettre : conditions non remplies',
        code: 'CONDITIONS_GATE_NON_REMPLIES',
        details: {
          conditions_manquantes: gate.conditions
            .filter((c) => !c.valide)
            .map((c) => `${c.libelle} (actuel: ${c.valeur_actuelle}, requis: ${c.valeur_requise})`),
        },
      })
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.stade.update({
        where: { id: stade.id },
        data: { statut: StatutStade.SOUMIS, soumis_le: new Date() },
      })
      await tx.projet.update({
        where: { id: projetId },
        data: { statut: StatutProjet.EN_EVALUATION },
      })
      if (projet.mentor_id) {
        await tx.notification.create({
          data: {
            utilisateur_id: projet.mentor_id,
            type: 'STADE_SOUMIS',
            titre: 'Nouveau stade à évaluer',
            corps: `Le projet "${projet.titre}" — Stade ${numStade} attend votre évaluation.`,
            lien_relatif: `/projets/${projetId}/stades/${numStade}`,
          },
        })
      }
    })

    return {
      statut: 'SOUMIS',
      soumis_le: new Date().toISOString(),
      message: `Stade ${numStade} soumis. Votre mentor a été notifié.`,
    }
  }

  // ─── ÉVALUER (MENTOR) ────────────────────────────────────────────────────────
  // Logique conservée depuis featuresAdimin — inchangée car correcte

  async evaluerStade(
    projetId: string,
    numStade: number,
    mentorId: string,
    dto: {
      note: number
      commentaire: string
      criteres: Record<string, number>
      decision: 'VALIDE' | 'RENVOYE'
      motif_renvoi?: string
    },
  ) {
    const { stade, projet } = await this._getStade(projetId, numStade, mentorId)

    if (projet.mentor_id !== mentorId) throw new ForbiddenException('MENTOR_NON_ASSIGNE')
    if (stade.statut !== StatutStade.SOUMIS) throw new BadRequestException('STADE_NON_SOUMIS')

    let decision = dto.decision
    // Règle métier : note < 40 → RENVOYE forcé
    if (dto.note < 40) decision = 'RENVOYE'
    if (decision === 'RENVOYE' && !dto.motif_renvoi) throw new BadRequestException('MOTIF_REQUIS')

    const evaluation = await this.prisma.$transaction(async (tx) => {
      const eval_ = await tx.evaluation.create({
        data: {
          stade_id: stade.id,
          mentor_id: mentorId,
          note: dto.note,
          commentaire: dto.commentaire,
          criteres: dto.criteres,
          decision: decision as 'VALIDE' | 'RENVOYE',
          motif_renvoi: dto.motif_renvoi ?? null,
        },
      })

      const nouveauStatutStade = decision === 'VALIDE' ? StatutStade.VALIDE : StatutStade.EN_REVISION
      await tx.stade.update({
        where: { id: stade.id },
        data: {
          statut: nouveauStatutStade,
          score_auto: dto.note,
          valide_le: decision === 'VALIDE' ? new Date() : null,
        },
      })

      if (decision === 'VALIDE') {
        // Avancer le BRL (Niveau de Maturité)
        await tx.projet.update({
          where: { id: projetId },
          data: { brl_actuel: numStade, statut: StatutProjet.EN_COURS },
        })

        const scoreActuel = await tx.scoreProjet.findUnique({ where: { projet_id: projetId } })
        if (scoreActuel) {
          const stadeScores = [
            numStade === 1 ? dto.note : scoreActuel.score_stade_1,
            numStade === 2 ? dto.note : scoreActuel.score_stade_2,
            numStade === 3 ? dto.note : scoreActuel.score_stade_3,
            numStade === 4 ? dto.note : scoreActuel.score_stade_4,
            numStade === 5 ? dto.note : scoreActuel.score_stade_5,
            numStade === 6 ? dto.note : scoreActuel.score_stade_6,
            numStade === 7 ? dto.note : scoreActuel.score_stade_7,
          ]
          const scores_non_zero = stadeScores.filter((s) => s > 0)
          const score_global =
            scores_non_zero.length > 0
              ? scores_non_zero.reduce((a, b) => a + b, 0) / scores_non_zero.length
              : 0

          const scoreField = `score_stade_${numStade}` as const
          await tx.scoreProjet.update({
            where: { projet_id: projetId },
            data: {
              [scoreField]: dto.note,
              score_global,
              score_innovation: (stadeScores[0] + stadeScores[1]) / 2,
              score_marche: stadeScores[2],
              score_equipe: stadeScores[4],
              score_finance: (stadeScores[3] + stadeScores[4]) / 2,
              score_execution: (stadeScores[5] + stadeScores[6]) / 2,
            },
          })

          // Débloquer le stade suivant
          if (numStade < 7) {
            await tx.stade.updateMany({
              where: { projet_id: projetId, type: NUM_TO_TYPE[numStade + 1] },
              data: { statut: StatutStade.DEBLOQUE },
            })
          }

          // Diplôme : BRL >= 6 ET score_global >= 65
          if (numStade >= 6 && score_global >= 65) {
            await tx.projet.update({
              where: { id: projetId },
              data: { statut: StatutProjet.DIPLOME, est_public: true },
            })
          }
        }
      } else {
        await tx.projet.update({
          where: { id: projetId },
          data: { statut: StatutProjet.EN_COURS },
        })
      }

      // Notification à l'entrepreneur
      const typeNotif = decision === 'VALIDE' ? 'STADE_VALIDE' : 'STADE_RENVOYE'
      const titreNotif = decision === 'VALIDE'
        ? `Stade ${numStade} validé !`
        : `Stade ${numStade} : corrections demandées`
      const corpsNotif = decision === 'VALIDE'
        ? `Votre Stade ${numStade} a été validé. Vous pouvez passer au stade suivant.`
        : `Votre mentor demande des corrections sur le Stade ${numStade}. Motif : ${dto.motif_renvoi || 'Non spécifié'}`

      await tx.notification.create({
        data: {
          utilisateur_id: projet.proprietaire_id,
          type: typeNotif,
          titre: titreNotif,
          corps: corpsNotif,
          lien_relatif: `/projets/${projetId}/stades/${numStade}`,
        },
      })

      return eval_
    })

    return {
      id: evaluation.id,
      note: dto.note,
      decision,
      statut_stade: decision === 'VALIDE' ? 'VALIDE' : 'EN_REVISION',
      brl_actuel: decision === 'VALIDE' ? numStade : projet.brl_actuel,
      message: `Évaluation enregistrée. L'entrepreneur a été notifié.`,
      redirection_missions:
        decision === 'VALIDE' && numStade < 7
          ? { projetId, numStade: numStade + 1 }
          : null,
    }
  }

  // ─── GET HISTORIQUE ÉVALUATIONS ──────────────────────────────────────────────

  async getEvaluations(projetId: string, userId: string, roleUser?: string) {
    const projet = await this.prisma.projet.findUnique({ where: { id: projetId } })
    if (!projet) throw new NotFoundException('PROJET_INTROUVABLE')

    const allowed =
      projet.proprietaire_id === userId ||
      projet.mentor_id === userId ||
      roleUser === 'ADMIN' ||
      (roleUser === 'INVESTISSEUR' && projet.est_public)

    if (!allowed) throw new ForbiddenException('NON_AUTORISE')

    const evals = await this.prisma.evaluation.findMany({
      where: { stade: { projet_id: projetId } },
      include: { mentor: { select: { id: true, prenom: true, nom: true } } },
      orderBy: { cree_le: 'desc' },
    })

    return evals.map((e) => ({
      id: e.id,
      stade_id: e.stade_id,
      note: e.note,
      commentaire: e.commentaire,
      criteres: e.criteres,
      decision: e.decision,
      motif_renvoi: e.motif_renvoi,
      cree_le: e.cree_le.toISOString(),
      mentor: e.mentor,
    }))
  }
}
