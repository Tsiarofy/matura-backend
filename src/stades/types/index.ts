// src/stades/types/index.ts
// Types partagés entre l'Orchestrateur et tous les Engines

export interface AlerteInterne {
  code: string
  niveau: 'CRITIQUE' | 'ATTENTION' | 'INFO'
  message: string
}

export interface GateCondition {
  code: string
  libelle: string
  valide: boolean
  valeur_actuelle: number | string | boolean
  valeur_requise: number | string | boolean
}

export interface GateResult {
  peut_soumettre: boolean
  completion_pct: number
  conditions: GateCondition[]
  alertes_critiques: AlerteInterne[]
}
