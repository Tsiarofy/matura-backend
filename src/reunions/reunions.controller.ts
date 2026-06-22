import {
  Controller, Post, Patch, Get, Param, Body, UseGuards, Request,
} from '@nestjs/common'
import { ReunionsService } from './reunions.service'
import { DemandeReunionDto } from './dto/demande-reunion.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('reunions')
@UseGuards(JwtAuthGuard)
export class ReunionsController {
  constructor(private readonly reunionsService: ReunionsService) {}

  // POST /api/reunions/demande
  @Post('demande')
  creerDemande(@Request() req: any, @Body() dto: DemandeReunionDto) {
    return this.reunionsService.creerDemande(req.user.payload.id, dto)
  }

  // POST /api/reunions/instantane
  @Post('instantane')
  creerInstantane(@Request() req: any, @Body() dto: DemandeReunionDto) {
    return this.reunionsService.creerInstantane(req.user.payload.id, dto)
  }

  // GET /api/reunions/mes-reunions
  @Get('mes-reunions')
  listerMesReunions(@Request() req: any) {
    return this.reunionsService.listerMesReunions(req.user.payload.id)
  }

  // PATCH /api/reunions/:id/confirmer
  @Patch(':id/confirmer')
  confirmerReunion(@Param('id') id: string, @Request() req: any) {
    return this.reunionsService.confirmerReunion(id, req.user.payload.id)
  }

  // PATCH /api/reunions/:id/refuser
  @Patch(':id/refuser')
  refuserReunion(@Param('id') id: string, @Request() req: any) {
    return this.reunionsService.refuserReunion(id, req.user.payload.id)
  }

  // GET /api/reunions/:id/rejoindre
  @Get(':id/rejoindre')
  rejoindreReunion(@Param('id') id: string, @Request() req: any) {
    return this.reunionsService.rejoindreReunion(id, req.user.payload.id)
  }

  // PATCH /api/reunions/:id/modifier-date
  @Patch(':id/modifier-date')
  modifierDate(
    @Param('id') id: string,
    @Request() req: any,
    @Body('date_planifiee') datePlanifiee: string,
  ) {
    return this.reunionsService.modifierDateReunion(id, req.user.payload.id, datePlanifiee)
  }
}
