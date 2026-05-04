// src/geo/geo.service.ts
// Service géographique basé sur la table DonneesGeographiques (INSTAT 2018, 17 465 Fokontany)
// Hiérarchie : REGION → DISTRICT → COMMUNE → FOKONTANY

import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// Configuration de la hiérarchie géographique
// Chaque niveau connaît son champ code+nom et le niveau de ses enfants
const HIERARCHY = {
  REGION: {
    codeField: 'code_region' as const,
    nomField: 'nom_region' as const,
    childLevel: 'DISTRICT' as const,
  },
  DISTRICT: {
    codeField: 'code_district' as const,
    nomField: 'nom_district' as const,
    childLevel: 'COMMUNE' as const,
  },
  COMMUNE: {
    codeField: 'code_commune' as const,
    nomField: 'nom_commune' as const,
    childLevel: 'FOKONTANY' as const,
  },
  FOKONTANY: {
    codeField: 'code_fokontany' as const,
    nomField: 'nom_fokontany' as const,
    childLevel: null,
  },
} as const

type NiveauGeo = keyof typeof HIERARCHY

export interface ZoneItem {
  code: string
  nom: string
}

export interface StatistiquesZone {
  population_2018: number
  projection_actuelle: number  // Valeur de la colonne projection_2026 (INSTAT)
                               // Renommée ici pour découpler l'API du nom de colonne DB
  nb_fokontany: number
}

interface SousZones {
  tout_selectionner: boolean
  items: Array<{ code: string; nom: string }>
}

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  // ── GET /geo/regions ──────────────────────────────────────────────────────
  // Toutes les régions distinctes (22 régions Madagascar)
  async getRegions(): Promise<ZoneItem[]> {
    const rows = await this.prisma.donneesGeographiques.findMany({
      select: { code_region: true, nom_region: true },
      distinct: ['code_region'],
      orderBy: { nom_region: 'asc' },
    })
    return rows.map((r) => ({ code: r.code_region, nom: r.nom_region }))
  }

  // ── GET /geo/enfants?niveau=REGION&code=MG11 ──────────────────────────────
  // Zones enfants du niveau inférieur :
  //   niveau=REGION,   code=<code_region>   → les districts de cette région
  //   niveau=DISTRICT, code=<code_district> → les communes de ce district
  //   niveau=COMMUNE,  code=<code_commune>  → les fokontany de cette commune
  //   niveau=FOKONTANY                      → [] (terminal, pas d'enfants)
  async getEnfants(niveauParent: string, codeParent: string): Promise<ZoneItem[]> {
    const parentConfig = HIERARCHY[niveauParent as NiveauGeo]
    if (!parentConfig) {
      throw new BadRequestException(
        `Niveau inconnu : ${niveauParent}. Valeurs attendues : REGION | DISTRICT | COMMUNE | FOKONTANY`,
      )
    }

    if (parentConfig.childLevel === null) return []

    const childConfig = HIERARCHY[parentConfig.childLevel]

    const rows = await this.prisma.donneesGeographiques.findMany({
      where: { [parentConfig.codeField]: codeParent },
      select: {
        [childConfig.codeField]: true,
        [childConfig.nomField]: true,
      },
      distinct: [childConfig.codeField],
      orderBy: { [childConfig.nomField]: 'asc' },
    })

    return rows.map((r: Record<string, string>) => ({
      code: r[childConfig.codeField],
      nom: r[childConfig.nomField],
    }))
  }

  // ── GET /geo/population?code=MG11&niveau=REGION ────────────────────────────
  // Calcul de population temps réel pour une zone donnée
  // Utilisé côté UI pour afficher la taille de marché pendant la sélection
  async getPopulation(code: string, niveau: string): Promise<StatistiquesZone> {
    return this.getStatistiquesZone(code, niveau, { tout_selectionner: true, items: [] })
  }

  // ── MÉTHODE INTERNE : Agrégation géo-hiérarchique ─────────────────────────
  // Appelée par Stade1Engine lors du PUT pour injecter les métriques de population.
  // Logique d'agrégation selon CONCEPTION_IMPACT_GEO_MENTOR.md :
  //   - Si niveau = REGION et tout_selectionner ou items vide → somme tous fokontany de la région
  //   - Si sous_zones.items présents → somme uniquement les fokontany des sous-zones spécifiées
  async getStatistiquesZone(
    codeZone: string,
    niveau: string,
    sousZones: SousZones,
  ): Promise<StatistiquesZone> {
      // console.log("AVANT LA REQUETE")
    const config = HIERARCHY[niveau as NiveauGeo]
    if (!config) {
      throw new BadRequestException(`Niveau inconnu : ${niveau}`)
    }

    let where: Record<string, unknown>

    // Détermine le filtre WHERE selon la sélection hiérarchique
    if (
      !sousZones ||
      sousZones.tout_selectionner ||
      !sousZones.items ||
      sousZones.items.length === 0
    ) {
      // Agrégation complète : tous les fokontany de la zone principale
      where = { [config.codeField]: codeZone }
    } else {
      // Agrégation partielle : sous-zones sélectionnées uniquement
      // On détermine le niveau des enfants de la zone principale pour filtrer
      if (config.childLevel === null) {
        // Fokontany terminal : un seul record
        where = { [config.codeField]: codeZone }
      } else {
        const childConfig = HIERARCHY[config.childLevel]
        const codes = sousZones.items.map((i) => i.code)
        where = { [childConfig.codeField]: { in: codes } }
      }
    }
  
    const agg = await this.prisma.donneesGeographiques.aggregate({
      where,
      _sum: {
        population_2018: true,
        projection_2026: true,
      },
      _count: {
        code_fokontany: true,
      },
    })
    // console.log("APRES LA REQUETE")
    return {
      population_2018: agg._sum.population_2018 ?? 0,
      projection_actuelle: agg._sum.projection_2026 ?? 0, // colonne DB : projection_2026
      nb_fokontany: agg._count.code_fokontany ?? 0,
    }
  }

  // ── POST /geo/calcul-marche ───────────────────────────────────────────────
  // Calcul de marché pour Stade 3 avec prise en compte du type de client (B2B/B2C)
  async calculerMarche(request: {
    typeClient: 'B2C' | 'B2B'
    codeZone: string
    niveauZone: string
    pctUtilisateurs: number
    partsConcurrents: Array<{ nom: string; part_globale_pct: number; part_zone_pct: number }>
    tam_valeur: number
    sam_valeur: number
    som_valeur: number
  }): Promise<{
    population_totale: number
    population_concernee: number
    parts_concurrents_zone_pct: number
    population_occupee_concurrents: number
    population_disponible: number
    sam_pct_utilisateurs: number
    sam_pct_population_totale: number
    som_pct_utilisateurs: number
    som_pct_population_totale: number
    alertes: string[]
    niveau_alerte: 'VERT' | 'ORANGE' | 'ROUGE'
  }> {
    // Pour B2B, retourner seulement les valeurs saisies sans calculs
    if (request.typeClient === 'B2B') {
      return {
        population_totale: 0,
        population_concernee: 0,
        parts_concurrents_zone_pct: 0,
        population_occupee_concurrents: 0,
        population_disponible: 0,
        sam_pct_utilisateurs: 0,
        sam_pct_population_totale: 0,
        som_pct_utilisateurs: 0,
        som_pct_population_totale: 0,
        alertes: [],
        niveau_alerte: 'VERT',
      }
    }

    // 1. Population totale de la zone
    const statsZone = await this.getStatistiquesZone(
      request.codeZone,
      request.niveauZone,
      { tout_selectionner: true, items: [] }
    )
    const populationTotale = statsZone.population_2018

    // 2. Population concernée (utilisateurs potentiels)
    const populationConcernee = (populationTotale * request.pctUtilisateurs) / 100

    // 3. Parts concurrents dans la zone
    const totalPartsConcurrentsZone = request.partsConcurrents.reduce(
      (sum, c) => sum + c.part_zone_pct, 0
    )

    // 4. Population occupée par les concurrents
    const populationOccupee = (populationTotale * totalPartsConcurrentsZone) / 100

    // 5. Population disponible
    const populationDisponible = populationTotale - populationOccupee

    // 6. Pourcentages SAM par rapport aux utilisateurs et population totale
    const samPctUtilisateurs = populationConcernee > 0
      ? (request.sam_valeur / populationConcernee) * 100
      : 0
    const samPctTotale = populationTotale > 0
      ? (request.sam_valeur / populationTotale) * 100
      : 0

    // 7. Pourcentages SOM par rapport aux utilisateurs et population totale
    const somPctUtilisateurs = populationConcernee > 0
      ? (request.som_valeur / populationConcernee) * 100
      : 0
    const somPctTotale = populationTotale > 0
      ? (request.som_valeur / populationTotale) * 100
      : 0

    // 8. Alertes basées sur benchmarks startup
    const alertes: string[] = []
    let niveauAlerte: 'VERT' | 'ORANGE' | 'ROUGE' = 'VERT'

    // Seuils basés sur benchmarks : early-stage startups capturent 2-5% de leur SAM
    // SOM > 30% des utilisateurs calculés = irréaliste
    if (somPctUtilisateurs > 30) {
      alertes.push(`SOM représente ${somPctUtilisateurs.toFixed(1)}% des utilisateurs calculés. Les startups early-stage capturent généralement 2-5% de leur marché cible. Considérez un objectif plus réaliste.`)
      niveauAlerte = 'ROUGE'
    } else if (somPctUtilisateurs > 10) {
      alertes.push(`SOM représente ${somPctUtilisateurs.toFixed(1)}% des utilisateurs calculés. C'est ambitieux mais possible avec une exécution excellente.`)
      niveauAlerte = 'ORANGE'
    }

    // SAM > 60% des utilisateurs calculés = warning
    if (samPctUtilisateurs > 60) {
      alertes.push(`SAM représente ${samPctUtilisateurs.toFixed(1)}% des utilisateurs calculés. Vérifiez que votre SAM est réaliste par rapport à votre capacité actuelle.`)
      if (niveauAlerte === 'VERT') niveauAlerte = 'ORANGE'
    }

    return {
      population_totale: populationTotale,
      population_concernee: populationConcernee,
      parts_concurrents_zone_pct: totalPartsConcurrentsZone,
      population_occupee_concurrents: populationOccupee,
      population_disponible: populationDisponible,
      sam_pct_utilisateurs: samPctUtilisateurs,
      sam_pct_population_totale: samPctTotale,
      som_pct_utilisateurs: somPctUtilisateurs,
      som_pct_population_totale: somPctTotale,
      alertes,
      niveau_alerte: niveauAlerte,
    }
  }
}
