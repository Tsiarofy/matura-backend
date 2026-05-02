// src/stades/engines/stade7.engine.ts
// Moteur Stade 7 — Lancement (Deck Investisseur, Cohérence Financement)

import { Injectable } from '@nestjs/common'
import { IStadeEngine } from './IStadeEngine'
import { GateResult, GateCondition, AlerteInterne } from '../types'
import { DonneesStade7 } from '@matura/shared'

// Les métriques S7 ne sont pas encore définies dans shared — on définit le type ici
// Elles seront ajoutées dans MetriquesStade7Schema lors du prochain cycle
interface MetriquesStade7 {
  montant_demande_ar: number
  somme_utilisations_ar: number
  coherence_utilisation: boolean
  score_completude_deck: number
}

@Injectable()
export class Stade7Engine implements IStadeEngine<DonneesStade7, MetriquesStade7> {
  calculerMetriques(donnees: DonneesStade7): MetriquesStade7 {
    const demande = donnees.demande_financement
    const montant_demande_ar = demande?.montant_ar ?? 0
    const utilisation = demande?.utilisation ?? []
    const somme_utilisations_ar = utilisation.reduce((s, u) => s + (u.montant_ar ?? 0), 0)
    const coherence_utilisation = montant_demande_ar > 0 && Math.abs(montant_demande_ar - somme_utilisations_ar) < 1

    // Complétude du deck : 3 blocs requis
    const blocsOk = [
      !!donnees.resume_executif?.phrase_accroche,
      montant_demande_ar > 0,
      !!donnees.contexte_investisseur?.pourquoi_maintenant,
    ].filter(Boolean).length
    const score_completude_deck = Math.round((blocsOk / 3) * 100)

    return {
      montant_demande_ar,
      somme_utilisations_ar,
      coherence_utilisation,
      score_completude_deck,
    }
  }

  verifierGate(donnees: DonneesStade7, metriques: MetriquesStade7): GateResult {
    const conds: GateCondition[] = []
    const alertes: AlerteInterne[] = []

    const addCond = (
      code: string, libelle: string, valide: boolean,
      actuel: number | string | boolean, requis: number | string | boolean,
    ) => {
      conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
      if (!valide) alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
    }

    addCond('RESUME', 'Résumé exécutif rempli', !!donnees.resume_executif?.phrase_accroche, !!donnees.resume_executif?.phrase_accroche, true)
    addCond('DEMANDE', 'Demande de financement remplie', metriques.montant_demande_ar > 0, metriques.montant_demande_ar, '>0')
    addCond('UTILISATION', 'Utilisation = montant demandé', metriques.coherence_utilisation, metriques.somme_utilisations_ar, metriques.montant_demande_ar)
    addCond('CONTEXTE', 'Contexte investisseur rempli', !!donnees.contexte_investisseur?.pourquoi_maintenant, !!donnees.contexte_investisseur?.pourquoi_maintenant, true)

    const nb_valides = conds.filter((c) => c.valide).length
    const completion_pct = conds.length > 0 ? Math.round((nb_valides / conds.length) * 100) : 0

    return { peut_soumettre: conds.every((c) => c.valide), completion_pct, conditions: conds, alertes_critiques: alertes }
  }
}
