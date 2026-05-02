// src/stades/engines/stade1.engine.ts
// Moteur Stade 1 — Émergence & Géo Hiérarchique
// Injecte GeoService pour calculer la population réelle depuis DonneesGeographiques
// Gate vérifie zone_principale.code (structure hiérarchique, patch selectionGeo)
//
// FIX: Tous les accès aux sous-propriétés de `donnees` sont maintenant sécurisés
// avec l'opérateur `?? {}` (objet vide) ou `?? []` (tableau vide) pour éviter
// les erreurs "Cannot read properties of undefined" quand donnees est partiel
// ou vide (brouillon, stade nouvellement créé).

import { Injectable } from '@nestjs/common'
import { GeoService } from '../../geo/geo.service'
import { IStadeEngine } from './IStadeEngine'
import { GateResult, GateCondition, AlerteInterne } from '../types'
import { DonneesStade1, MetriquesStade1 } from '@matura/shared'

@Injectable()
export class Stade1Engine implements IStadeEngine<DonneesStade1, MetriquesStade1> {
  constructor(private readonly geoService: GeoService) {}

  // ── Calcul des métriques — async car appel BDD pour la population ─────────
  async calculerMetriques(donnees: DonneesStade1): Promise<MetriquesStade1> {
    let score_solidite_probleme = 0
    let nombre = 0
    let cout = 0

    // FIX: Utilisation de ?? {} pour chaque sous-objet susceptible d'être absent
    const obs = donnees.observations_terrain ?? ({} as Partial<DonneesStade1['observations_terrain']>)
    const profil = donnees.profil_affecte ?? ({} as Partial<DonneesStade1['profil_affecte']>)
    const intensite = donnees.intensite_probleme ?? ({} as Partial<DonneesStade1['intensite_probleme']>)
    const solutions = donnees.solutions_existantes ?? []

    const verbatims = obs.verbatims ?? []
    const nb = obs.nb_personnes_interrogees ?? 0
    nombre = profil.nombre_estime ?? 0
    const severite = intensite.severite ?? 1
    cout = intensite.cout_actuel_ar ?? 0

    if (donnees.contexte_geographique) {
      score_solidite_probleme = Math.round(
        Math.min(nb / 10, 1) * 30 +
        ((severite - 1) / 4) * 25 +
        Math.min(solutions.length / 3, 1) * 20 +
        Math.min(verbatims.length / 5, 1) * 15 +
        (cout > 0 ? 10 : 0),
      )
    }

    // ── Calcul de la population via GeoService (données INSTAT Fokontany) ────
    let population_reference = 0
    let population_projetee = 0

    try {
      const geo = donnees.contexte_geographique
      if (geo?.zone_principale?.code) {
        const stats = await this.geoService.getStatistiquesZone(
          geo.zone_principale.code,
          geo.niveau_principal,
          geo.sous_zones,
        )
        population_reference = stats.population_2018
        population_projetee = stats.projection_actuelle
      }
    } catch {
      // Si les données géo ne sont pas disponibles, on garde 0
      // Le gate ZONE_GEO sera invalidé séparément
      population_reference = 0
      population_projetee = 0
    }

    return {
      score_solidite_probleme,
      marche_preliminaire_ar: (population_reference || nombre) * cout,
      population_reference,
      population_projetee,
      coherence_population: population_reference > 0 || nombre > 0,
    }
  }

  // ── Vérification Gate — structure hiérarchique (patch selectionGeo) ────────
  verifierGate(donnees: DonneesStade1, metriques: MetriquesStade1): GateResult {
    const conds: GateCondition[] = []
    const alertes: AlerteInterne[] = []

    const addCond = (
      code: string,
      libelle: string,
      valide: boolean,
      actuel: number | string | boolean,
      requis: number | string | boolean,
    ) => {
      conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
      if (!valide)
        alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
    }

    // FIX: Sécurisation des accès dans verifierGate également
    const obs = donnees.observations_terrain ?? ({} as Partial<DonneesStade1['observations_terrain']>)
    const nb = obs.nb_personnes_interrogees ?? 0
    const verbatims = (obs.verbatims ?? []).filter((v) => v.trim().length > 0).length
    const solutions = (donnees.solutions_existantes ?? []).length
    const score = metriques.score_solidite_probleme ?? 0

    // ZONE_GEO : vérification par zone_principale.code (structure hiérarchique)
    const geo = donnees.contexte_geographique
    const aZonePrincipale = !!(geo?.zone_principale?.code?.trim())

    addCond('NB_ENTRETIENS', 'Minimum 3 entretiens terrain', nb >= 3, nb, 3)
    addCond('VERBATIMS', 'Minimum 2 verbatims', verbatims >= 2, verbatims, 2)
    addCond('SOLUTIONS', 'Au moins 1 solution existante', solutions >= 1, solutions, 1)
    addCond(
      'ZONE_GEO',
      'Zone géographique sélectionnée',
      aZonePrincipale,
      aZonePrincipale ? 'définie' : 'absente',
      'définie',
    )
    addCond('SCORE_SOLIDITE', 'Score solidité >= 30', score >= 30, score, 30)

    const nb_valides = conds.filter((c) => c.valide).length
    const completion_pct = conds.length > 0 ? Math.round((nb_valides / conds.length) * 100) : 0

    return {
      peut_soumettre: conds.every((c) => c.valide),
      completion_pct,
      conditions: conds,
      alertes_critiques: alertes,
    }
  }
}
