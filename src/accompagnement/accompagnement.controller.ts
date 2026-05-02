// src/accompagnement/accompagnement.controller.ts
// Adapté depuis new-features/featuresAdimin pour respecter la structure de routes CONCEPTION_FINALE_V4

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { AccompagnementService } from './accompagnement.service'

interface RequestWithUser extends Request {
  user: { payload: { id: string; email: string; role: string } }
}

// ─── ROUTES ENTREPRENEUR : /projets/:projetId/demandes ──────────────────────

@Controller('projets/:projetId/demandes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DemandesProjetController {
  constructor(private readonly svc: AccompagnementService) {}

  // POST /projets/:projetId/demandes — envoyer une demande à un mentor
  @Post()
  @Roles('ENTREPRENEUR')
  @HttpCode(HttpStatus.CREATED)
  envoyerDemande(
    @Param('projetId') projetId: string,
    @Req() req: RequestWithUser,
    @Body() body: { mentor_id: string; message?: string },
  ) {
    return this.svc.envoyerDemande(projetId, req.user.payload.id, body)
  }

  // GET /projets/:projetId/demandes — consulter mes demandes envoyées
  @Get()
  @Roles('ENTREPRENEUR')
  getMesDemandesEnvoyees(
    @Param('projetId') projetId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.getMesDemandesEnvoyees(projetId, req.user.payload.id)
  }

  // DELETE /projets/:projetId/demandes/:demandeId — annuler une demande
  @Delete(':demandeId')
  @Roles('ENTREPRENEUR')
  annuler(
    @Param('demandeId') demandeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.annulerDemande(demandeId, req.user.payload.id)
  }
}

// ─── ROUTES MENTOR : /demandes ────────────────────────────────────────────────

@Controller('demandes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DemandesMentorController {
  constructor(private readonly svc: AccompagnementService) {}

  // GET /demandes — demandes reçues par le mentor connecté
  @Get()
  @Roles('MENTOR')
  getMesDemandes(
    @Req() req: RequestWithUser,
    @Query('statut') statut?: string,
    @Query('page') page?: string,
    @Query('limite') limite?: string,
  ) {
    return this.svc.getMesDemandes(req.user.payload.id, {
      statut,
      page: page ? parseInt(page, 10) : undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
    })
  }

  @Patch(':id')
  @Roles('MENTOR')
  repondre(
    @Param('id') demandeId: string,
    @Req() req: RequestWithUser,
    @Body() body: { statut: 'ACCEPTE' | 'REFUSE' },
  ) {
    return this.svc.repondreDemande(demandeId, req.user.payload.id, body)
  }
}

// ─── ROUTES MENTOR : /projets-suivis ───────────────────────────────────────────

@Controller('projets-suivis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjetsSuivisController {
  constructor(private readonly svc: AccompagnementService) {}

  @Get()
  @Roles('MENTOR')
  getProjetsSuivis(@Req() req: RequestWithUser) {
    return this.svc.getProjetsSuivis(req.user.payload.id)
  }
}

// ─── ROUTE PUBLIQUE : /mentors ────────────────────────────────────────────────
// Consultable par les entrepreneurs (sidebar : "Mentors disponibles")

@Controller('mentors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MentorsController {
  constructor(private readonly svc: AccompagnementService) {}

  // GET /mentors — liste des mentors disponibles (APPROUVE)
  @Get()
  @Roles('ENTREPRENEUR')
  getMentorsDisponibles(
    @Query('page') page?: string,
    @Query('limite') limite?: string,
  ) {
    return this.svc.getMentorsDisponibles({
      page: page ? parseInt(page, 10) : undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
    })
  }
}
