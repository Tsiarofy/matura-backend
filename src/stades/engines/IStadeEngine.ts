// src/stades/engines/IStadeEngine.ts
// Interface générique typée — chaque Engine doit l'implémenter avec ses propres types
// L'utilisation de Generics TypeScript assure la sécurité de typage à la compilation

import { GateResult } from '../types'

export interface IStadeEngine<TDonnees, TMetriques> {
  /**
   * Calcule les métriques métier à partir des données saisies.
   * Ex: Calcul de population (S1), Point Mort (S5), etc.
   * Peut être async (ex: S1 qui interroge la BDD pour la population Geo)
   */
  calculerMetriques(donnees: TDonnees): Promise<TMetriques> | TMetriques

  /**
   * Vérifie si les conditions de succès (Gate) sont remplies.
   * Retourne la liste des conditions valides/invalides et les alertes critiques.
   */
  verifierGate(donnees: TDonnees, metriques: TMetriques): GateResult
}
