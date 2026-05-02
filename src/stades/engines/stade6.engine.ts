// src/stades/engines/stade6.engine.ts
// Moteur Stade 6 — Prototype (MVP, retours clients, traction)

import { Injectable } from '@nestjs/common'
import { IStadeEngine } from './IStadeEngine'
import { GateResult, GateCondition, AlerteInterne } from '../types'
import { DonneesStade6, MetriquesStade6 } from '@matura/shared'

@Injectable()
export class Stade6Engine implements IStadeEngine<DonneesStade6, MetriquesStade6> {
  calculerMetriques(donnees: DonneesStade6): MetriquesStade6 {
    const retours = donnees.retours_clients ?? []
    const metriques = donnees.metriques_usage

    const positifs = retours.filter((r) => r.sentiment === 'POSITIF').length
    const taux_positivite_retours = retours.length > 0
      ? Math.round((positifs / retours.length) * 100) : 0

    const nps = metriques?.score_nps ?? -100
    const taux_retention = metriques?.taux_retention_pct ?? 0
    const clients_payants = metriques?.clients_payants ?? 0

    // Signal Product-Market Fit : combinaison NPS, rétention, positivité retours
    const signal_product_market_fit = Math.round(
      ((nps + 100) / 200) * 40 +        // NPS normalisé sur 40 pts
      (taux_retention / 100) * 30 +      // Rétention sur 30 pts
      (taux_positivite_retours / 100) * 30, // Positivité retours sur 30 pts
    )

    return {
      signal_product_market_fit: Math.min(signal_product_market_fit, 100),
      taux_positivite_retours,
    }
  }

  verifierGate(donnees: DonneesStade6, metriques: MetriquesStade6): GateResult {
    const conds: GateCondition[] = []
    const alertes: AlerteInterne[] = []

    const addCond = (
      code: string, libelle: string, valide: boolean,
      actuel: number | string | boolean, requis: number | string | boolean,
    ) => {
      conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
      if (!valide) alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
    }

    const retours = (donnees.retours_clients ?? []).length
    const iterations = (donnees.iterations ?? []).length
    const mUsage = donnees.metriques_usage
    const clients = mUsage?.clients_payants ?? 0
    const revenus = mUsage?.revenus_generes_ar ?? 0
    const nps = mUsage?.score_nps ?? -100

    addCond('RETOURS', 'Minimum 5 retours clients', retours >= 5, retours, 5)
    addCond('TRACTION', 'Clients payants > 0 ou revenus > 0', clients > 0 || revenus > 0, clients > 0 || revenus > 0, true)
    addCond('NPS', 'NPS >= 0', nps >= 0, nps, 0)
    addCond('ITERATIONS', 'Au moins 1 itération documentée', iterations >= 1, iterations, 1)

    const nb_valides = conds.filter((c) => c.valide).length
    const completion_pct = conds.length > 0 ? Math.round((nb_valides / conds.length) * 100) : 0

    return { peut_soumettre: conds.every((c) => c.valide), completion_pct, conditions: conds, alertes_critiques: alertes }
  }
}
