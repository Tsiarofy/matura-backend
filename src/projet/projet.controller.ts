import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ProjetService } from './projet.service'
import { type CreationProjetDto } from '@matura/shared'
import { StatutProjet } from '@prisma/client'

interface RequestWithUser extends Request {
  user: {
    payload: {
      id: string
      email: string
      role: string
    }
  }
}

@Controller('projets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjetController {
  constructor(private readonly projetService: ProjetService) {}

  /**
   * POST /api/projets
   * Crée un nouveau projet
   * Accessible : ENTREPRENEUR uniquement
   */
  @Post()
  @Roles('ENTREPRENEUR')
  @HttpCode(HttpStatus.CREATED)
  async creerProjet(
    @Body() dto: CreationProjetDto,
    @Req() req: RequestWithUser,
  ) {
        // console.log("Entre dans le controlller - - - - - - - - -");
        // console.log(req.user.payload);
    const projet = await this.projetService.creerProjet(dto, req.user.payload.id);
    return projet
  }

  /**
   * GET /api/projets/mes-projets
   * Liste les projets de l'entrepreneur connecté
   * Accessible : ENTREPRENEUR uniquement
   */
  @Get('mes-projets')
  @Roles('ENTREPRENEUR')
  async getMesProjets(
    @Req() req: RequestWithUser,
    @Query('statut') statut?: string,
    @Query('page') page?: string,
    @Query('limite') limite?: string,
  ) {
    const filters = {
      statut: statut as StatutProjet | undefined,
      page: page ? parseInt(page, 10) : undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
    }
    // console.log("- - - - - - - -  - - - - - - - - - ")
    // console.log("Entrer dans le controller")
    return this.projetService.getMesProjets(req.user.payload.id, filters)
  }

  /**
   * GET /api/projets/:id
   * Détail complet d'un projet
   * Accessible : Propriétaire | Mentor assigné | Admin
   */
  @Get(':id')
  async getProjetDetail(
    @Param('id') projetId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.projetService.getProjetDetail(
      projetId,
      req.user.payload.id,
      req.user.payload.role,
    )
  }
}




