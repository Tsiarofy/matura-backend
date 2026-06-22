// src/stades/engines/stade5.engine.ts
// Moteur Stade 5 — Faisabilité (Finance, Équipe, Jalons)
//
// FIX: Tous les accès aux sous-propriétés de `donnees` sont maintenant sécurisés
// avec ?? {} / ?? [] pour éviter les erreurs "Cannot read properties of undefined"
// quand donnees est partiel (brouillon, stade nouvellement créé).
//
// FIX v2 (logique uniquement, aucun changement de type ou de nom de champ) :
//   - roi : basé sur le résultat cumulé 3 ans, pas uniquement l'année 3.
//   - autonomie_mois : calcul corrigé — mois pour atteindre le point mort
//     à la cadence mensuelle projetée en année 1.

import { Injectable } from '@nestjs/common'
import { IStadeEngine } from './IStadeEngine'
import { GateResult, GateCondition, AlerteInterne } from '../types'
import { DonneesStade5, MetriquesStade5 } from '@matura/shared'

@Injectable()
export class Stade5Engine implements IStadeEngine<DonneesStade5, MetriquesStade5> {
  calculerMetriques(donnees: DonneesStade5): MetriquesStade5 {
    // Sécurisation des sous-objets pouvant être absents (brouillon vide)
    const finances = donnees.finances ?? ({} as Partial<DonneesStade5['finances']>)
    const membres = donnees.membres_equipe ?? []
    const disciplines = donnees.disciplines_requises_projet ?? []
    const jalons = donnees.jalons ?? []

    // ── Données financières de base ──────────────────────────────────────────
    const chargesFixes = (finances.charges_fixes ?? []).reduce(
      (s, c) => s + ((c.montant_mensuel_ar ?? 0) * 12), 0,
    )
    const coutVar = (finances.charges_variables ?? []).reduce(
      (s, c) => s + (c.montant_par_unite_ar ?? 0), 0,
    )
    const prixVente = finances.prix_vente_ar ?? 0
    const unites = finances.unites_projetees ?? { annee1: 0, annee2: 0, annee3: 0 }
    const investissement = finances.investissement_initial_ar ?? 0

    // ── Point mort ───────────────────────────────────────────────────────────
    const marge = prixVente - coutVar
    const point_mort_unites = marge > 0 ? Math.ceil(chargesFixes / marge) : 0
    const point_mort_revenus = point_mort_unites * prixVente

    // ── Prévisionnel CA & résultat ───────────────────────────────────────────
    const ca1 = unites.annee1 * prixVente
    const ca2 = unites.annee2 * prixVente
    const ca3 = unites.annee3 * prixVente
    const res1 = ca1 - chargesFixes - unites.annee1 * coutVar
    const res2 = ca2 - chargesFixes - unites.annee2 * coutVar
    const res3 = ca3 - chargesFixes - unites.annee3 * coutVar

    // FIX — ROI : calculé sur le résultat cumulé 3 ans, pas seulement l'année 3.
    // Ancienne formule : (res3 - investissement) / investissement
    //   → ignorait res1 et res2, faussant le ROI selon le profil de rentabilité.
    const roi = investissement > 0
      ? Math.round((((res1 + res2 + res3) - investissement) / investissement) * 100)
      : 0

    // FIX — autonomie_mois : mois nécessaires pour atteindre le point mort,
    // à la cadence de vente mensuelle projetée en année 1.
    //
    // Ancienne formule : chargesFixes / (marge * 12)
    //   → mélange dimensionnel : montant annuel divisé par (marge unitaire × 12)
    //     sans tenir compte du volume de ventes, résultat sans sens métier.
    //
    // Nouvelle logique : point_mort_unites / (unites.annee1 / 12)
    //   Si annee1 = 0 ou marge = 0 → on reste à 0 (données insuffisantes).
    const autonomie_mois = marge > 0 && unites.annee1 > 0
      ? Math.ceil(point_mort_unites / (unites.annee1 / 12))
      : 0

    // ── Interdisciplinarité équipe ────────────────────────────────────────────
    const disciplinesPresentes = new Set<string>()
    membres.forEach((m) => (m.disciplines ?? []).forEach((dc) => disciplinesPresentes.add(dc)))
    const score_interdisciplinarite = disciplines.length > 0
      ? Math.round((disciplinesPresentes.size / disciplines.length) * 100) : 0
    const disciplines_manquantes = disciplines.filter((dc) => !disciplinesPresentes.has(dc))

    // ratio_revenu_client : calculé si données S3 disponibles (inchangé)
    const ratio_revenu_client = 0

    return {
      charges_fixes_annuelles: chargesFixes,
      cout_variable_unitaire: coutVar,
      marge_contribution: marge,
      point_mort_unites,
      point_mort_revenus,
      ca_previsionnel: { annee1: ca1, annee2: ca2, annee3: ca3 },
      resultat_net: { annee1: res1, annee2: res2, annee3: res3 },
      roi,
      autonomie_mois,
      score_interdisciplinarite,
      disciplines_manquantes: disciplines_manquantes as typeof disciplines,
      ratio_revenu_client,
      // Compteurs — inclus pour affichage frontend (GET stade)
      nb_membres: membres.length,
      nb_jalons: jalons.length,
    }
  }

  verifierGate(donnees: DonneesStade5, metriques: MetriquesStade5): GateResult {
    const conds: GateCondition[] = []
    const alertes: AlerteInterne[] = []

    const addCond = (
      code: string, libelle: string, valide: boolean,
      actuel: number | string | boolean, requis: number | string | boolean,
    ) => {
      conds.push({ code, libelle, valide, valeur_actuelle: actuel, valeur_requise: requis })
      if (!valide) alertes.push({ code, niveau: 'CRITIQUE', message: `${libelle} — actuel: ${actuel}, requis: ${requis}` })
    }

    const marge = metriques.marge_contribution ?? 0
    const res1 = metriques.resultat_net?.annee1 ?? 0
    const res2 = metriques.resultat_net?.annee2 ?? 0
    const res3 = metriques.resultat_net?.annee3 ?? 0
    // FIX: Accès sécurisé à membres_equipe et jalons dans Gate
    const membres = (donnees.membres_equipe ?? []).length
    const jalons = (donnees.jalons ?? []).length
    const scoreEquipe = metriques.score_interdisciplinarite ?? 0

    addCond('MARGE_POSITIVE', 'Marge contribution > 0', marge > 0, marge, '>0')
    
    const auMoinsUneAnneePositive = res1 > 0 || res2 > 0 || res3 > 0
    addCond('RESULTAT_NET', 'Résultat net positif sur au moins 1 an', auMoinsUneAnneePositive, `an1:${res1}/an2:${res2}/an3:${res3}`, 'au moins 1 > 0')
    
    addCond('MEMBRES', 'Au moins 1 membre équipe', membres >= 1, membres, 1)
    addCond('JALONS', 'Minimum 3 jalons', jalons >= 3, jalons, 3)
    addCond('INTERDISCIPLINARITE', 'Score équipe >= 50%', scoreEquipe >= 50, scoreEquipe, 50)

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