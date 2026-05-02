// src/stades/engines/stade2.engine.ts
// Moteur Stade 2 — Idéation (Lean Canvas)

import { Injectable } from '@nestjs/common'
import { IStadeEngine } from './IStadeEngine'
import { GateResult, GateCondition, AlerteInterne } from '../types'
import { DonneesStade2, MetriquesStade2 } from '@matura/shared'

@Injectable()
export class Stade2Engine implements IStadeEngine<DonneesStade2, MetriquesStade2> {
  calculerMetriques(donnees: DonneesStade2): MetriquesStade2 {
    const couts = donnees.bloc_structure_couts ?? []
    const revenus = donnees.bloc_sources_revenus ?? []
    const solution = donnees.bloc_solution

    const burn_rate_mensuel = couts.reduce((s, c) => s + (c.montant_mensuel_ar ?? 0), 0)
    const revenu_potentiel_mensuel = revenus.reduce((s, r) => s + (r.estimation_mensuelle_ar ?? 0), 0)
    const ecart_mensuel = revenu_potentiel_mensuel - burn_rate_mensuel
    const nb_must_have = (solution?.fonctionnalites ?? []).filter((f) => f.priorite === 'INDISPENSABLE').length

    // Score de cohérence Lean Canvas (blocs non vides)
    const blocsReq = [
      'bloc_probleme', 'bloc_segments_clients', 'bloc_solution',
      'bloc_proposition_valeur', 'bloc_canaux', 'bloc_sources_revenus', 'bloc_structure_couts',
    ]
    const blocsOk = blocsReq.filter((b) => !!(donnees as Record<string, unknown>)[b]).length
    const score_coherence_canvas = Math.round((blocsOk / blocsReq.length) * 100)

    return {
      burn_rate_mensuel,
      revenu_potentiel_mensuel,
      ecart_mensuel,
      nb_must_have,
      score_coherence_canvas,
    }
  }

  verifierGate(donnees: DonneesStade2, metriques: MetriquesStade2): GateResult {
    const conds: GateCondition[] = []
    const alertes: AlerteInterne[] = []

    const addCond = (
      code: string, libelle: string, valide: boolean,
      actuel: number | string | boolean, requis: number | string | boolean,
    ) => {
      conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
      if (!valide) alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
    }

    const blocsReq = [
      'bloc_probleme', 'bloc_segments_clients', 'bloc_solution',
      'bloc_proposition_valeur', 'bloc_canaux', 'bloc_sources_revenus', 'bloc_structure_couts',
    ]
    const blocsOk = blocsReq.filter((b) => !!(donnees as Record<string, unknown>)[b]).length
    const sources = (donnees.bloc_sources_revenus ?? []).length

    addCond('BLOCS_COMPLETS', `Tous les blocs remplis (${blocsReq.length})`, blocsOk >= blocsReq.length, blocsOk, blocsReq.length)
    addCond('SOURCES_REVENUS', 'Au moins 1 source de revenus', sources >= 1, sources, 1)

    const nb_valides = conds.filter((c) => c.valide).length
    const completion_pct = conds.length > 0 ? Math.round((nb_valides / conds.length) * 100) : 0

    return { peut_soumettre: conds.every((c) => c.valide), completion_pct, conditions: conds, alertes_critiques: alertes }
  }
}
