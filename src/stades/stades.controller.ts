import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { StadesService } from './stades.service'

// Pattern cohérent avec projet.controller.ts existant
interface RequestWithUser extends Request {
  user: {
    payload: {
      id: string
      email: string
      role: string
    }
  }
}

@Controller('projets/:projetId/stades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StadesController {
  constructor(private readonly stadesService: StadesService) {}

  // GET /projets/:projetId/stades/:num
  @Get(':num')
  getStade(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Req() req: RequestWithUser,
  ) {
    return this.stadesService.getStade(projetId, num, req.user.payload.id, req.user.payload.role)
  }

  // PUT /projets/:projetId/stades/:num
  @Put(':num')
  enregistrerStade(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Req() req: RequestWithUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.stadesService.enregistrerStade(projetId, num, req.user.payload.id, body)
  }

  // GET /projets/:projetId/stades/:num/verifier-gate
  @Get(':num/verifier-gate')
  verifierGate(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Req() req: RequestWithUser,
  ) {
    return this.stadesService.verifierGateStade(projetId, num, req.user.payload.id)
  }

  // POST /projets/:projetId/stades/:num/soumettre
  @Post(':num/soumettre')
  @HttpCode(HttpStatus.OK)
  soumettre(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Req() req: RequestWithUser,
  ) {
    console.log("arriver dans le controller de soumission")
    return this.stadesService.soumettreStade(projetId, num, req.user.payload.id)
  }

  // POST /projets/:projetId/stades/:num/evaluations
  @Post(':num/evaluations')
  @HttpCode(HttpStatus.CREATED)
  evaluer(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Req() req: RequestWithUser,
    @Body()
    body: {
      note: number
      commentaire: string
      criteres: Record<string, number>
      decision: 'VALIDE' | 'RENVOYE'
      motif_renvoi?: string
    },
  ) {
    return this.stadesService.evaluerStade(projetId, num, req.user.payload.id, body)
  }
}

// GET /projets/:projetId/evaluations (historique)
@Controller('projets/:projetId/evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
  constructor(private readonly stadesService: StadesService) {}

  @Get()
  getEvaluations(
    @Param('projetId') projetId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.stadesService.getEvaluations(projetId, req.user.payload.id, req.user.payload.role)
  }
}
