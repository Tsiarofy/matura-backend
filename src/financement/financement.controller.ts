import {
  Controller, Get, Post, Patch, Body,
  Param, Query, UseGuards,
} from '@nestjs/common';
import { FinancementService } from './financement.service';
import { CreerOffreDto } from './dto/creer-offre.dto';
import { PostulerDto } from './dto/postuler.dto';
import { ChangerStatutDto } from './dto/changer-statut.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { type FiltresFinancement } from '@matura/shared';
import { ParseIntQueryPipe } from '../common/pipes/parse-int-pipe';

@Controller('financements')
@UseGuards(JwtAuthGuard)
export class FinancementController {
  constructor(private readonly service: FinancementService) {}

  // ─── Routes communes (ordre important — spécifiques avant paramétrées) ────────

  /**
   * GET /financements/mes-offres
   * Offres créées par l'investisseur connecté.
   * IMPORTANT : doit être avant /:id pour ne pas être capté comme paramètre
   */
  @Get('mes-offres')
  @Roles('INVESTISSEUR')
  @UseGuards(RolesGuard)
  mesOffres(@CurrentUser('id') investisseurId: string) {
    return this.service.mesOffres(investisseurId);
  }

  /**
   * GET /financements/mes-candidatures
   * Candidatures soumises par l'entrepreneur connecté.
   */
  @Get('mes-candidatures')
  @Roles('ENTREPRENEUR')
  @UseGuards(RolesGuard)
  mesCandidatures(@CurrentUser('id') entrepreneurId: string) {
    return this.service.mesCandidatures(entrepreneurId);
  }

  /**
   * GET /financements/candidatures-recues
   * Candidatures reçues sur les offres de l'investisseur.
   */
  @Get('candidatures-recues')
  @Roles('INVESTISSEUR')
  @UseGuards(RolesGuard)
  candidaturesRecues(
    @CurrentUser('id') investisseurId: string,
    @Query('offreId') offreId?: string,
  ) {
    return this.service.candidaturesRecues(investisseurId, offreId);
  }

  // ─── Routes liste / création ─────────────────────────────────────────────────

  /**
   * GET /financements
   * Liste paginée des offres avec filtres (entrepreneur).
   */
  @Get()
  listerOffres(
    @Query(new ParseIntQueryPipe(['page', 'limit', 'montantMin', 'montantMax', 'stadeCible']))
    filtres: FiltresFinancement,
  ) {
    return this.service.listerOffres(filtres);
  }

  /**
   * POST /financements
   * Créer une offre (investisseur).
   */
  @Post()
  @Roles('INVESTISSEUR')
  @UseGuards(RolesGuard)
  creerOffre(
    @CurrentUser('id') investisseurId: string,
    @Body() dto: CreerOffreDto,
  ) {
    return this.service.creerOffre(investisseurId, dto);
  }

  // ─── Routes paramétrées /:id ──────────────────────────────────────────────────

  /**
   * GET /financements/:id
   * Détail complet d'une offre.
   */
  @Get(':id')
  getOffre(@Param('id') id: string) {
    return this.service.getOffreById(id);
  }

  /**
   * GET /financements/:id/projets-eligibles
   * Projets de l'entrepreneur éligibles à cette offre.
   * Filtre : brl_actuel >= max(6, offre.stadeCible) + statut != ARCHIVE
   */
  @Get(':id/projets-eligibles')
  @Roles('ENTREPRENEUR')
  @UseGuards(RolesGuard)
  getProjetsEligibles(
    @Param('id') offreId: string,
    @CurrentUser('id') entrepreneurId: string,
  ) {
    return this.service.getProjetsEligibles(entrepreneurId, offreId);
  }

  /**
   * POST /financements/:id/postuler
   * Soumettre une candidature.
   */
  @Post(':id/postuler')
  @Roles('ENTREPRENEUR')
  @UseGuards(RolesGuard)
  postuler(
    @Param('id') offreId: string,
    @CurrentUser('id') entrepreneurId: string,
    @Body() dto: PostulerDto,
  ) {
    return this.service.postuler(entrepreneurId, offreId, dto);
  }

  /**
   * PATCH /financements/candidatures/:candidatureId/statut
   * Changer le statut d'une candidature (investisseur).
   */
  @Patch('candidatures/:candidatureId/statut')
  @Roles('INVESTISSEUR')
  @UseGuards(RolesGuard)
  changerStatut(
    @Param('candidatureId') candidatureId: string,
    @CurrentUser('id') investisseurId: string,
    @Body() dto: ChangerStatutDto,
  ) {
    return this.service.changerStatutCandidature(
      investisseurId,
      candidatureId,
      dto.statut,
    );
  }
}

@Controller('investisseur')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvestisseurController {
  constructor(private readonly service: FinancementService) {}

  // GET /investisseur/projets
  @Get('projets')
  @Roles('INVESTISSEUR', 'ADMIN')
  getProjets(
    @Query('domaine')   domaine?: string,
    @Query('score_min') score_min?: string,
    @Query('region')    region?: string,
    @Query('page')      page?: string,
    @Query('limite')    limite?: string,
  ) {
    return this.service.getProjetsInvestisseurs({
      domaine,
      score_min: score_min ? parseFloat(score_min) : undefined,
      region,
      page:   page   ? parseInt(page, 10)   : undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
    });
  }

  // GET /investisseur/projets/:projetId/fiche
  @Get('projets/:projetId/fiche')
  @Roles('INVESTISSEUR', 'ADMIN')
  getFiche(@Param('projetId') projetId: string) {
    return this.service.getFicheInvestisseur(projetId);
  }
}
