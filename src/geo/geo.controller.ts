// src/geo/geo.controller.ts
// Pas de guard JWT — données géographiques publiques (non-sensibles)
// Pattern identique à projet.controller.ts et stades.controller.ts

import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common'
import { GeoService } from './geo.service'

interface SousZones {
  tout_selectionner: boolean
  items: Array<{ code: string; nom: string }>
}

interface PopulationRequest {
  niveau: string
  code: string
  sousZones: SousZones
}

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  // GET /api/geo/regions
  // Retourne les 22 régions Madagascar pour le premier niveau de sélection
  @Get('regions')
  getRegions() {
    return this.geoService.getRegions()
  }

  // GET /api/geo/enfants?niveau=REGION&code=MG11
  // Retourne les zones enfants du niveau inférieur
  //   REGION   → districts    (niveau=REGION,   code=<code_region>)
  //   DISTRICT → communes     (niveau=DISTRICT, code=<code_district>)
  //   COMMUNE  → fokontany    (niveau=COMMUNE,  code=<code_commune>)
  @Get('enfants')
  getEnfants(
    @Query('niveau') niveau: string,
    @Query('code') code: string,
  ) {
    if (!niveau || !code) {
      throw new BadRequestException('Les paramètres "niveau" et "code" sont requis')
    }
    return this.geoService.getEnfants(niveau, code)
  }

  // GET /api/geo/population?code=MG11&niveau=REGION
  // Calcul de population temps réel pour une zone (utilisé dans GeoSelector)
  @Get('population')
  getPopulation(
    @Query('code') code: string,
    @Query('niveau') niveau: string,
  ) {
    if (!code || !niveau) {
      throw new BadRequestException('Les paramètres "code" et "niveau" sont requis')
    }
    return this.geoService.getPopulation(code, niveau)
  }

  // POST /api/geo/population
  // Calcul de population avec sous-zones spécifiques (pour affichage temps réel)
  @Post('population')
  getPopulationWithSousZones(@Body() body: PopulationRequest) {
    if (!body.code || !body.niveau) {
      throw new BadRequestException('Les paramètres "code" et "niveau" sont requis')
    }
    return this.geoService.getStatistiquesZone(body.code, body.niveau, body.sousZones)
  }

  // POST /api/geo/calcul-marche
  // Calcul de marché pour Stade 3 avec prise en compte du type de client (B2B/B2C)
  @Post('calcul-marche')
  calculerMarche(@Body() body: {
    typeClient: 'B2C' | 'B2B'
    codeZone: string
    niveauZone: string
    pctUtilisateurs: number
    partsConcurrents: Array<{ nom: string; part_globale_pct: number; part_zone_pct: number }>
    tam_valeur: number
    sam_valeur: number
    som_valeur: number
  }) {
    if (!body.codeZone || !body.niveauZone) {
      throw new BadRequestException('Les paramètres "codeZone" et "niveauZone" sont requis')
    }
    return this.geoService.calculerMarche(body)
  }
}
