// src/stades/engines/stade4.engine.ts
// Moteur Stade 4 — Business Model Canvas (BMC)

import { Injectable } from '@nestjs/common'
import { IStadeEngine } from './IStadeEngine'
import { GateResult, GateCondition, AlerteInterne } from '../types'
import { DonneesStade4, MetriquesStade4 } from '@matura/shared'

@Injectable()
export class Stade4Engine implements IStadeEngine<DonneesStade4, MetriquesStade4> {
  calculerMetriques(donnees: DonneesStade4): MetriquesStade4 {
    const revenus = donnees.sources_revenus ?? []
    const couts = donnees.structure_couts ?? []

    const revenu_total_mensuel = revenus.reduce((s, r) => s + (r.revenu_mensuel_ar ?? 0), 0)
    const couts_total_mensuel = couts.reduce((s, c) => s + (c.montant_mensuel_ar ?? 0), 0)
    const marge_brute_pct = revenu_total_mensuel > 0
      ? Math.round(((revenu_total_mensuel - couts_total_mensuel) / revenu_total_mensuel) * 100)
      : 0

    // Complétude BMC : 7 blocs actifs (canaux et relations_clients sont optionnels
    // car ils étaient déjà saisis en Stade 2 via bloc_canaux)
    const blocs = [
      'evolution_lean_canvas', 'propositions_valeur', 'segments_clients',
      'ressources_cles', 'activites_cles', 'partenaires_cles',
      'structure_couts', 'sources_revenus',
    ]
    const remplis = blocs.filter((b) => !!(donnees as Record<string, unknown>)[b]).length
    const score_completude_bmc = Math.round((remplis / blocs.length) * 100)

    return {
      revenu_total_mensuel,
      couts_total_mensuel,
      marge_brute_pct,
      score_completude_bmc,
    }
  }

  verifierGate(donnees: DonneesStade4, metriques: MetriquesStade4): GateResult {
    const conds: GateCondition[] = []
    const alertes: AlerteInterne[] = []

    const addCond = (
      code: string, libelle: string, valide: boolean,
      actuel: number | string | boolean, requis: number | string | boolean,
    ) => {
      conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
      if (!valide) alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
    }

    const rev = (donnees.sources_revenus ?? []).length
    const evolution = donnees.evolution_lean_canvas
    const completude = metriques.score_completude_bmc ?? 0

    addCond('COMPLETUDE_BMC', 'Complétude BMC >= 70%', completude >= 70, completude, 70)
    addCond('EVOLUTION', 'Évolution depuis Lean Canvas documentée', !!evolution?.ce_qui_a_change, !!evolution?.ce_qui_a_change, true)
    addCond('SOURCES_REVENUS', 'Au moins 1 source de revenus', rev >= 1, rev, 1)

    const nb_valides = conds.filter((c) => c.valide).length
    const completion_pct = conds.length > 0 ? Math.round((nb_valides / conds.length) * 100) : 0

    return { peut_soumettre: conds.every((c) => c.valide), completion_pct, conditions: conds, alertes_critiques: alertes }
  }
}
