import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TypeStade, StatutStade, StatutProjet } from '@prisma/client'

// ─── TYPES INTERNES ────────────────────────────────────────────────────────────

type Donnees = Record<string, unknown>

interface AlerteInterne {
  code: string
  niveau: 'CRITIQUE' | 'ATTENTION' | 'INFO'
  message: string
}

interface GateCondition {
  code: string
  libelle: string
  valide: boolean
  valeur_actuelle: number | string | boolean
  valeur_requise: number | string|boolean
}

interface GateResult {
  peut_soumettre: boolean
  completion_pct: number
  conditions: GateCondition[]
  alertes_critiques: AlerteInterne[]
}

// ─── MAPPING TYPE ↔ NUMÉRO ────────────────────────────────────────────────────

const TYPE_TO_NUM: Record<TypeStade, number> = {
  STADE_1_EMERGENCE: 1,
  STADE_2_IDEATION: 2,
  STADE_3_MARCHE: 3,
  STADE_4_BMC: 4,
  STADE_5_FAISABILITE: 5,
  STADE_6_PROTOTYPE: 6,
  STADE_7_LANCEMENT: 7,
}

const NUM_TO_TYPE: Record<number, TypeStade> = {
  1: TypeStade.STADE_1_EMERGENCE,
  2: TypeStade.STADE_2_IDEATION,
  3: TypeStade.STADE_3_MARCHE,
  4: TypeStade.STADE_4_BMC,
  5: TypeStade.STADE_5_FAISABILITE,
  6: TypeStade.STADE_6_PROTOTYPE,
  7: TypeStade.STADE_7_LANCEMENT,
}

// ─── CALCUL COMPLÉTION ────────────────────────────────────────────────────────

function calculerCompletion(donnees: Donnees, num: number): number {
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

// ─── MÉTRIQUES PAR STADE ──────────────────────────────────────────────────────

function calculerMetriquesS1(d: Donnees): Donnees {
  const obs = (d.observations_terrain ?? {}) as Donnees
  const profil = (d.profil_affecte ?? {}) as Donnees
  const intensite = (d.intensite_probleme ?? {}) as Donnees
  const solutions = (d.solutions_existantes as unknown[]) ?? []
  const verbatims = ((obs.verbatims as unknown[]) ?? [])
  const nb = (obs.nb_personnes_interrogees as number) ?? 0
  const nombre = (profil.nombre_estime as number) ?? 0
  const severite = (intensite.severite as number) ?? 1
  const cout = (intensite.cout_actuel_ar as number) ?? 0

  const score_solidite_probleme = Math.round(
    Math.min(nb / 10, 1) * 30 +
    ((severite - 1) / 4) * 25 +
    Math.min(solutions.length / 3, 1) * 20 +
    Math.min(verbatims.length / 5, 1) * 15 +
    (cout > 0 ? 10 : 0),
  )

  return {
    score_solidite_probleme,
    marche_preliminaire_ar: nombre * cout,
    nb_personnes_interrogees: nb,
    nb_solutions_existantes: solutions.length,
    coherence_population: nombre > 0,
  }
}

function calculerMetriquesS3(d: Donnees): Donnees {
  const enquete = (d.enquete ?? {}) as Donnees
  const concurrents = (d.concurrents as unknown[]) ?? []
  const prix = (d.positionnement_prix ?? {}) as Donnees
  const irp = (prix.irp ?? {}) as Donnees

  const tauxPositif = (enquete.taux_reponse_positive as number) ?? 0
  const echantillon = (enquete.taille_echantillon as number) ?? 0
  const revenuMoyen = (irp.revenu_moyen_zone_ar as number) ?? 0
  const prixReco = (prix.prix_recommande_ar as number) ?? 0

  const ratio_revenu_pct = revenuMoyen > 0 ? (prixReco / revenuMoyen) * 100 : 0
  let niveau_realisme: string = 'CRITIQUE'
  if (ratio_revenu_pct > 0 && ratio_revenu_pct <= 5) niveau_realisme = 'REALISTE'
  else if (ratio_revenu_pct > 5 && ratio_revenu_pct <= 15) niveau_realisme = 'ATTENTION'

  const score_marche = Math.round(
    Math.min(echantillon / 50, 1) * 25 +
    (tauxPositif / 100) * 30 +
    Math.min(concurrents.length / 3, 1) * 25 +
    (niveau_realisme === 'REALISTE' ? 20 : niveau_realisme === 'ATTENTION' ? 10 : 0),
  )

  return {
    score_marche,
    ratio_revenu_pct: Math.round(ratio_revenu_pct * 100) / 100,
    niveau_realisme,
    cout_mensuel_equivalent: prixReco,
    nb_concurrents: concurrents.length,
  }
}

function calculerMetriquesS5(d: Donnees): Donnees {
  const finances = (d.finances ?? {}) as Donnees
  const membres = (d.membres_equipe as Donnees[]) ?? []
  const disciplines = (d.disciplines_requises_projet as string[]) ?? []
  const jalons = (d.jalons as unknown[]) ?? []

  const chargesFixes = ((finances.charges_fixes as Donnees[]) ?? []).reduce(
    (s: number, c: Donnees) => s + ((c.montant_mensuel_ar as number) ?? 0) * 12, 0,
  )
  const coutVar = ((finances.charges_variables as Donnees[]) ?? []).reduce(
    (s: number, c: Donnees) => s + ((c.montant_par_unite_ar as number) ?? 0), 0,
  )
  const prixVente = (finances.prix_vente_ar as number) ?? 0
  const unites = (finances.unites_projetees as Record<string, number>) ?? { annee1: 0, annee2: 0, annee3: 0 }
  const investissement = (finances.investissement_initial_ar as number) ?? 0

  const marge = prixVente - coutVar
  const pointMort = marge > 0 ? Math.ceil(chargesFixes / marge) : 0
  const ca1 = unites.annee1 * prixVente
  const ca2 = unites.annee2 * prixVente
  const ca3 = unites.annee3 * prixVente
  const res1 = ca1 - chargesFixes - unites.annee1 * coutVar
  const res2 = ca2 - chargesFixes - unites.annee2 * coutVar
  const res3 = ca3 - chargesFixes - unites.annee3 * coutVar
  const roi = investissement > 0 ? Math.round(((res3 - investissement) / investissement) * 100) : 0

  // Interdisciplinarité
  const disciplinesPresentes = new Set<string>()
  membres.forEach((m) => ((m.disciplines as string[]) ?? []).forEach((dc) => disciplinesPresentes.add(dc)))
  const score_interdisciplinarite = disciplines.length > 0
    ? Math.round((disciplinesPresentes.size / disciplines.length) * 100) : 0
  const disciplines_manquantes = disciplines.filter((dc) => !disciplinesPresentes.has(dc))

  return {
    charges_fixes_annuelles: chargesFixes,
    cout_variable_unitaire: coutVar,
    marge_contribution: marge,
    point_mort_unites: pointMort,
    point_mort_revenus: pointMort * prixVente,
    ca_previsionnel: { annee1: ca1, annee2: ca2, annee3: ca3 },
    resultat_net: { annee1: res1, annee2: res2, annee3: res3 },
    roi,
    score_interdisciplinarite,
    disciplines_manquantes,
    nb_membres: membres.length,
    nb_jalons: jalons.length,
  }
}

function calculerMetriques(donnees: Donnees, num: number): Donnees {
  if (num === 1) return calculerMetriquesS1(donnees)
  if (num === 3) return calculerMetriquesS3(donnees)
  if (num === 5) return calculerMetriquesS5(donnees)
  return {}
}

// ─── GATES ────────────────────────────────────────────────────────────────────

function verifierGate(num: number, donnees: Donnees, metriques: Donnees): GateResult {
  const conds: GateCondition[] = []
  const alertes: AlerteInterne[] = []

  const addCond = (code: string, libelle: string, valide: boolean, actuel: number | string | boolean, requis: number | string|boolean) => {
    conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
    if (!valide) alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
  }

  switch (num) {
    case 1: {
      const obs = (donnees.observations_terrain ?? {}) as Donnees
      const nb = (obs.nb_personnes_interrogees as number) ?? 0
      const verbatims = ((obs.verbatims as unknown[]) ?? []).length
      const solutions = ((donnees.solutions_existantes as unknown[]) ?? []).length
      const geo = (donnees.contexte_geographique ?? {}) as Donnees
      const codes = ((geo.codes_selectionnes as string[]) ?? []).length
      const score = (metriques.score_solidite_probleme as number) ?? 0
      addCond('NB_ENTRETIENS', 'Minimum 3 entretiens terrain', nb >= 3, nb, 3)
      addCond('VERBATIMS', 'Minimum 2 verbatims', verbatims >= 2, verbatims, 2)
      addCond('SOLUTIONS', 'Au moins 1 solution existante', solutions >= 1, solutions, 1)
      addCond('ZONE_GEO', 'Zone géographique sélectionnée', codes >= 1, codes, 1)
      addCond('SCORE_SOLIDITE', 'Score solidité >= 30', score >= 30, score, 30)
      break
    }
    case 2: {
      const blocsReq = ['bloc_probleme', 'bloc_segments_clients', 'bloc_solution', 'bloc_proposition_valeur', 'bloc_canaux', 'bloc_sources_revenus', 'bloc_structure_couts']
      const blocsOk = blocsReq.filter((b) => !!donnees[b]).length
      const sources = ((donnees.bloc_sources_revenus as unknown[]) ?? []).length
      addCond('BLOCS_COMPLETS', `Tous les blocs remplis (${blocsReq.length})`, blocsOk >= blocsReq.length, blocsOk, blocsReq.length)
      addCond('SOURCES_REVENUS', 'Au moins 1 source de revenus', sources >= 1, sources, 1)
      break
    }
    case 3: {
      const nb = ((donnees.concurrents as unknown[]) ?? []).length
      const score = (metriques.score_marche as number) ?? 0
      const realisme = (metriques.niveau_realisme as string) ?? 'CRITIQUE'
      const sources = ((donnees.sources_marche as unknown[]) ?? []).length
      addCond('CONCURRENTS', 'Minimum 3 concurrents', nb >= 3, nb, 3)
      addCond('SCORE_MARCHE', 'Score marché >= 50', score >= 50, score, 50)
      addCond('IRP', 'Prix non critique (IRP)', realisme !== 'CRITIQUE', realisme, 'REALISTE ou ATTENTION')
      addCond('SOURCES', 'Au moins 1 source de données', sources >= 1, sources, 1)
      break
    }
    case 4: {
      const evolution = (donnees.evolution_lean_canvas ?? {}) as Donnees
      const rev = ((donnees.sources_revenus as unknown[]) ?? []).length
      const blocs = ['propositions_valeur', 'segments_clients', 'canaux', 'ressources_cles', 'activites_cles', 'partenaires_cles', 'structure_couts', 'sources_revenus', 'evolution_lean_canvas']
      const remplis = blocs.filter((b) => !!donnees[b]).length
      const completude = Math.round((remplis / blocs.length) * 100)
      addCond('COMPLETUDE_BMC', 'Complétude BMC >= 70%', completude >= 70, completude, 70)
      addCond('EVOLUTION', 'Évolution depuis Lean Canvas documentée', !!evolution.ce_qui_a_change, !!evolution.ce_qui_a_change, true)
      addCond('SOURCES_REVENUS', 'Au moins 1 source de revenus', rev >= 1, rev, 1)
      break
    }
    case 5: {
      const marge = (metriques.marge_contribution as number) ?? 0
      const res1 = ((metriques.resultat_net as Donnees)?.annee1 as number) ?? 0
      const membres = (metriques.nb_membres as number) ?? 0
      const jalons = (metriques.nb_jalons as number) ?? 0
      const scoreEquipe = (metriques.score_interdisciplinarite as number) ?? 0
      addCond('MARGE_POSITIVE', 'Marge contribution > 0', marge > 0, marge, '>0')
      addCond('RESULTAT_AN1', 'Résultat net positif an 1', res1 > 0, res1, '>0')
      addCond('MEMBRES', 'Au moins 1 membre équipe', membres >= 1, membres, 1)
      addCond('JALONS', 'Minimum 3 jalons', jalons >= 3, jalons, 3)
      addCond('INTERDISCIPLINARITE', 'Score équipe >= 50%', scoreEquipe >= 50, scoreEquipe, 50)
      break
    }
    case 6: {
      const retours = ((donnees.retours_clients as unknown[]) ?? []).length
      const iterations = ((donnees.iterations as unknown[]) ?? []).length
      const mUsage = (donnees.metriques_usage ?? {}) as Donnees
      const clients = (mUsage.clients_payants as number) ?? 0
      const revenus = (mUsage.revenus_generes_ar as number) ?? 0
      const nps = (mUsage.score_nps as number) ?? -100
      addCond('RETOURS', 'Minimum 5 retours clients', retours >= 5, retours, 5)
      addCond('TRACTION', 'Clients payants > 0 ou revenus > 0', clients > 0 || revenus > 0, clients > 0 || revenus > 0, true)
      addCond('NPS', 'NPS >= 0', nps >= 0, nps, 0)
      addCond('ITERATIONS', 'Au moins 1 itération documentée', iterations >= 1, iterations, 1)
      break
    }
    case 7: {
      const resume = (donnees.resume_executif ?? {}) as Donnees
      const demande = (donnees.demande_financement ?? {}) as Donnees
      const contexte = (donnees.contexte_investisseur ?? {}) as Donnees
      const utilisation = (demande.utilisation as Donnees[]) ?? []
      const montant = (demande.montant_ar as number) ?? 0
      const somme = utilisation.reduce((s, u) => s + ((u.montant_ar as number) ?? 0), 0)
      const coher = montant > 0 && Math.abs(montant - somme) < 1
      addCond('RESUME', 'Résumé exécutif rempli', !!resume.phrase_accroche, !!resume.phrase_accroche, true)
      addCond('DEMANDE', 'Demande de financement remplie', montant > 0, montant, '>0')
      addCond('UTILISATION', 'Utilisation = montant demandé', coher, somme, montant)
      addCond('CONTEXTE', 'Contexte investisseur rempli', !!contexte.pourquoi_maintenant, !!contexte.pourquoi_maintenant, true)
      break
    }
  }

  const nb_valides = conds.filter((c) => c.valide).length
  const completion_pct = conds.length > 0 ? Math.round((nb_valides / conds.length) * 100) : 0

  return {
    peut_soumettre: conds.every((c) => c.valide),
    completion_pct,
    conditions: conds,
    alertes_critiques: alertes,
  }
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────

@Injectable()
export class StadesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private async _getStade(projetId: string, numStade: number, userId: string, roleUser?: string) {
    const projet = await this.prisma.projet.findUnique({
      where: { id: projetId },
      include: {
        stades: { where: { type: NUM_TO_TYPE[numStade] } },
      },
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

  // ─── GET STADE ───────────────────────────────────────────────────────────────

  async getStade(projetId: string, numStade: number, userId: string, roleUser?: string) {
    const { stade } = await this._getStade(projetId, numStade, userId, roleUser)
    const donnees = (stade.donnees ?? {}) as Donnees
    const metriques = calculerMetriques(donnees, numStade)
    const completion_pct = calculerCompletion(donnees, numStade)

    const alertes = await this.prisma.alerteProjet.findMany({
      where: { projet_id: projetId, stade_type: NUM_TO_TYPE[numStade] },
    })

    return {
      id: stade.id,
      projet_id: projetId,
      type: stade.type,
      numero: numStade,
      statut: stade.statut,
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
    }
  }

  // ─── PUT STADE (enregistrement) ──────────────────────────────────────────────

  async enregistrerStade(projetId: string, numStade: number, userId: string, donnees: Donnees) {
    const { stade, projet, isProprietaire } = await this._getStade(projetId, numStade, userId)

    if (!isProprietaire) throw new ForbiddenException('SEUL_LE_PROPRIETAIRE_PEUT_MODIFIER')

    const statuts_modifiables: StatutStade[] = [StatutStade.BROUILLON, StatutStade.EN_REVISION, StatutStade.DEBLOQUE]
    if (!statuts_modifiables.includes(stade.statut)) {
      throw new BadRequestException(`STADE_NON_MODIFIABLE: statut=${stade.statut}`)
    }

    const metriques = calculerMetriques(donnees, numStade)
    const completion_pct = calculerCompletion(donnees, numStade)
    const gate = verifierGate(numStade, donnees, metriques)

    // Historique
    const historique = Array.isArray(stade.historique) ? stade.historique : []
    const snapshot = { version: stade.version, donnees: stade.donnees, enregistre_le: new Date().toISOString() }

    const nouveauStatut = stade.statut === StatutStade.DEBLOQUE ? StatutStade.BROUILLON : stade.statut
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
        },
      })

      // MAJ alertes
      await tx.alerteProjet.deleteMany({ where: { projet_id: projetId, stade_type: NUM_TO_TYPE[numStade] } })
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

      // MAJ statut projet BROUILLON → EN_COURS
      if (projet.statut === StatutProjet.BROUILLON) {
        await tx.projet.update({ where: { id: projetId }, data: { statut: StatutProjet.EN_COURS } })
      }

      // Métriques S5 → FinancesProjet
      if (numStade === 5 && metriques.point_mort_unites !== undefined) {
        const finances = (donnees.finances ?? {}) as Donnees
        const fData = {
          charges_fixes: finances.charges_fixes ?? [],
          charges_variables: finances.charges_variables ?? [],
          prix_vente_ar: (finances.prix_vente_ar as number) ?? 0,
          unites_projetees: finances.unites_projetees ?? { annee1: 0, annee2: 0, annee3: 0 },
          investissement_initial: (finances.investissement_initial_ar as number) ?? 0,
          besoin_financement: (finances.besoin_financement_ar as number) ?? 0,
          type_financement: (finances.type_financement as string) ?? 'MIXTE',
          point_mort_unites: metriques.point_mort_unites as number,
          point_mort_revenus: metriques.point_mort_revenus as number,
          ca_previsionnel: metriques.ca_previsionnel,
          resultat_net: metriques.resultat_net,
          roi: metriques.roi as number,
        }
        await tx.financesProjet.upsert({
          where: { projet_id: projetId },
          create: { projet_id: projetId, ...fData } as never,
          update: fData as never,
        })
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

  // ─── VÉRIFIER GATE ───────────────────────────────────────────────────────────

  async verifierGateStade(projetId: string, numStade: number, userId: string): Promise<GateResult> {
    const { stade } = await this._getStade(projetId, numStade, userId)
    const donnees = (stade.donnees ?? {}) as Donnees
    const metriques = calculerMetriques(donnees, numStade)
    return verifierGate(numStade, donnees, metriques)
  }

  // ─── SOUMETTRE ────────────────────────────────────────────────────────────────

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
      if (!prec || prec.statut !== StatutStade.VALIDE) {
        throw new UnprocessableEntityException({
          message: 'Le stade précédent doit être validé',
          code: 'STADE_PRECEDENT_NON_VALIDE',
        })
      }
    }

    // Vérif gate
    const donnees = (stade.donnees ?? {}) as Donnees
    const metriques = calculerMetriques(donnees, numStade)
    const gate = verifierGate(numStade, donnees, metriques)

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
      await tx.stade.update({ where: { id: stade.id }, data: { statut: StatutStade.SOUMIS, soumis_le: new Date() } })
      await tx.projet.update({ where: { id: projetId }, data: { statut: StatutProjet.EN_EVALUATION } })
    })

    return {
      statut: 'SOUMIS',
      soumis_le: new Date().toISOString(),
      message: `Stade ${numStade} soumis. Votre mentor a été notifié.`,
    }
  }

  // ─── ÉVALUER (MENTOR) ────────────────────────────────────────────────────────

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
    // Note < 40 → RENVOYE forcé
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
        // BRL++
        await tx.projet.update({ where: { id: projetId }, data: { brl_actuel: numStade, statut: StatutProjet.EN_COURS } })

        // MAJ score
        const scoreField = `score_stade_${numStade}` as const
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
          const score_global = scores_non_zero.length > 0
            ? scores_non_zero.reduce((a, b) => a + b, 0) / scores_non_zero.length : 0

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

          // Débloquer stade suivant
          if (numStade < 7) {
            await tx.stade.updateMany({
              where: { projet_id: projetId, type: NUM_TO_TYPE[numStade + 1] },
              data: { statut: StatutStade.DEBLOQUE },
            })
          }

          // Diplôme si BRL >= 6 && score >= 65
          if (numStade >= 6 && score_global >= 65) {
            await tx.projet.update({
              where: { id: projetId },
              data: { statut: StatutProjet.DIPLOME, est_public: true },
            })
          }
        }
      } else {
        await tx.projet.update({ where: { id: projetId }, data: { statut: StatutProjet.EN_COURS } })
      }

      return eval_
    })

    return {
      id: evaluation.id,
      note: dto.note,
      decision,
      statut_stade: decision === 'VALIDE' ? 'VALIDE' : 'EN_REVISION',
      brl_actuel: decision === 'VALIDE' ? numStade : projet.brl_actuel,
      message: `Évaluation enregistrée. L'entrepreneur a été notifié.`,
    }
  }

  // ─── GET HISTORIQUE ÉVALUATIONS ──────────────────────────────────────────────

  async getEvaluations(projetId: string, userId: string, roleUser?: string) {
    // Vérif accès projet (propriétaire, mentor, ou investisseur si public)
    const projet = await this.prisma.projet.findUnique({ where: { id: projetId } })
    if (!projet) throw new NotFoundException('PROJET_INTROUVABLE')

    const allowed =
      projet.proprietaire_id === userId ||
      projet.mentor_id === userId ||
      (roleUser === 'ADMIN') ||
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
