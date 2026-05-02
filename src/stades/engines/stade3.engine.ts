// src/stades/engines/stade3.engine.ts
// Moteur Stade 3 — Validation Marché (TAM/SAM/SOM + IRP)
//
// FIX: Tous les accès aux sous-propriétés de `donnees` sont maintenant sécurisés
// avec ?? {} / ?? [] pour éviter les erreurs "Cannot read properties of undefined"
// quand donnees est partiel (brouillon, stade nouvellement créé).

import { Injectable } from '@nestjs/common'
import { IStadeEngine } from './IStadeEngine'
import { GateResult, GateCondition, AlerteInterne } from '../types'
import { DonneesStade3, MetriquesStade3 } from '@matura/shared'

@Injectable()
export class Stade3Engine implements IStadeEngine<DonneesStade3, MetriquesStade3> {
  calculerMetriques(donnees: DonneesStade3): MetriquesStade3 {
    // FIX: Sécurisation des sous-objets potentiellement absents
    const enquete = donnees.enquete ?? ({} as Partial<DonneesStade3['enquete']>)
    const concurrents = donnees.concurrents ?? []
    const positionnement = donnees.positionnement_prix ?? ({} as Partial<DonneesStade3['positionnement_prix']>)
    const irp = positionnement.irp ?? ({} as Partial<NonNullable<DonneesStade3['positionnement_prix']>['irp']>)
    const taille = donnees.taille_marche ?? ({} as Partial<DonneesStade3['taille_marche']>)

    const tauxPositif = enquete.taux_reponse_positive ?? 0
    const echantillon = enquete.taille_echantillon ?? 0
    const revenuMoyen = irp.revenu_moyen_zone_ar ?? 0
    const prixReco = positionnement.prix_recommande_ar ?? 0

    const ratio_revenu_pct = revenuMoyen > 0 ? (prixReco / revenuMoyen) * 100 : 0
    let niveau_realisme: 'REALISTE' | 'ATTENTION' | 'CRITIQUE' = 'CRITIQUE'
    if (ratio_revenu_pct > 0 && ratio_revenu_pct <= 5) niveau_realisme = 'REALISTE'
    else if (ratio_revenu_pct > 5 && ratio_revenu_pct <= 15) niveau_realisme = 'ATTENTION'

    const score_echantillon = Math.min(echantillon / 50, 1) * 25
    const score_demande = (tauxPositif / 100) * 30
    const score_concurrence = Math.min(concurrents.length / 3, 1) * 25
    const score_prix = niveau_realisme === 'REALISTE' ? 20 : niveau_realisme === 'ATTENTION' ? 10 : 0
    const score_marche = Math.round(score_echantillon + score_demande + score_concurrence + score_prix)

    // Marché disponible en tenant compte des concurrents
    const population_reference = taille.population_reference ?? 0
    const sam_obj = taille.sam ?? ({} as Partial<NonNullable<DonneesStade3['taille_marche']>['sam']>)
    const population_libre = Math.round(population_reference * (1 - (taille.part_concurrents_pct ?? 0) / 100))
    const sam_realiste = sam_obj.valeur ?? 0
    const potentiel_marche_ar = sam_realiste * prixReco

    return {
      score_echantillon: Math.round(score_echantillon),
      score_demande: Math.round(score_demande),
      score_concurrence: Math.round(score_concurrence),
      score_marche,
      ratio_revenu_pct: Math.round(ratio_revenu_pct * 100) / 100,
      niveau_realisme,
      cout_mensuel_equivalent: prixReco,
      nb_concurrents: concurrents.length,
      population_libre,
      sam_realiste,
      potentiel_marche_ar,
    }
  }

  verifierGate(donnees: DonneesStade3, metriques: MetriquesStade3): GateResult {
    const conds: GateCondition[] = []
    const alertes: AlerteInterne[] = []

    const addCond = (
      code: string, libelle: string, valide: boolean,
      actuel: number | string | boolean, requis: number | string | boolean,
    ) => {
      conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
      if (!valide) alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
    }

    const nb = metriques.nb_concurrents ?? 0
    const score = metriques.score_marche ?? 0
    const realisme = metriques.niveau_realisme ?? 'CRITIQUE'
    // FIX: sources_marche peut être absent si donnees est partiel
    const sources = (donnees.sources_marche ?? []).length

    addCond('CONCURRENTS', 'Minimum 3 concurrents', nb >= 3, nb, 3)
    addCond('SCORE_MARCHE', 'Score marché >= 50', score >= 50, score, 50)
    addCond('IRP', 'Prix non critique (IRP)', realisme !== 'CRITIQUE', realisme, 'REALISTE ou ATTENTION')
    addCond('SOURCES', 'Au moins 1 source de données', sources >= 1, sources, 1)

    const nb_valides = conds.filter((c) => c.valide).length
    const completion_pct = conds.length > 0 ? Math.round((nb_valides / conds.length) * 100) : 0

    return { peut_soumettre: conds.every((c) => c.valide), completion_pct, conditions: conds, alertes_critiques: alertes }
  }
}
