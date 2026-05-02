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
      console.log("AVANT LA REQUETE")
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
}
