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
import { FormationsService } from './formations.service'
import { CreerFormationDto } from './dto/creer-formation.dto'
import { CreerLessonDto } from './dto/creer-lesson.dto'

interface RequestWithUser extends Request {
  user: { payload: { id: string; email: string; role: string } }
}

@Controller('formations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormationsController {
  constructor(private readonly svc: FormationsService) {}

  // GET /formations — liste avec filtres et pagination
  // Accès : ENTREPRENEUR et ADMIN uniquement
  @Get()
  @Roles('ENTREPRENEUR', 'ADMIN')
  listerFormations(
    @Query('domaine') domaine?: string,
    @Query('stade_cible') stade_cible?: string,
    @Query('type_cible') type_cible?: string,
    @Query('page') page?: string,
    @Query('limite') limite?: string,
  ) {
    return this.svc.listerFormations({
      domaine,
      stade_cible: stade_cible ? parseInt(stade_cible, 10) : undefined,
      type_cible,
      page: page ? parseInt(page, 10) : undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
    })
  }

  // GET /formations/mes-formations — formations créées par le mentor connecté
  // Accès : MENTOR uniquement
  @Get('mes-formations')
  @Roles('MENTOR')
  getMesFormations(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limite') limite?: string,
  ) {
    return this.svc.getMesFormations(req.user.payload.id, {
      page: page ? parseInt(page, 10) : undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
    })
  }

  // GET /formations/:id — détail d'une formation avec toutes ses leçons
  // Accès : ENTREPRENEUR et ADMIN (toutes), MENTOR (ses propres uniquement)
  @Get(':id')
  @Roles('ENTREPRENEUR', 'MENTOR', 'ADMIN')
  getFormationDetail(
    @Param('id') formationId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.getFormationDetail(formationId, req.user.payload.id, req.user.payload.role)
  }

  // POST /formations — créer une formation
  // Accès : MENTOR ou ADMIN (statut_compte APPROUVE requis pour MENTOR)
  @Post()
  @Roles('MENTOR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  creerFormation(
    @Body() dto: CreerFormationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.creerFormation(dto, req.user.payload.id)
  }

  // PATCH /formations/:id — modifier une formation
  // Accès : MENTOR (auteur uniquement) ou ADMIN
  @Patch(':id')
  @Roles('MENTOR', 'ADMIN')
  modifierFormation(
    @Param('id') formationId: string,
    @Body() dto: Partial<CreerFormationDto>,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.modifierFormation(formationId, dto, req.user.payload.id, req.user.payload.role)
  }

  // DELETE /formations/:id — supprimer une formation et ses leçons (cascade)
  // Accès : MENTOR (auteur uniquement) ou ADMIN
  @Delete(':id')
  @Roles('MENTOR', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  supprimerFormation(
    @Param('id') formationId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.supprimerFormation(formationId, req.user.payload.id, req.user.payload.role)
  }

  // POST /formations/:id/lessons — ajouter une leçon
  // Accès : MENTOR (auteur de la formation uniquement)
  @Post(':id/lessons')
  @Roles('MENTOR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  ajouterLesson(
    @Param('id') formationId: string,
    @Body() dto: CreerLessonDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.ajouterLesson(formationId, dto, req.user.payload.id, req.user.payload.role)
  }

  // PATCH /formations/:id/lessons/:lessonId — modifier une leçon
  @Patch(':id/lessons/:lessonId')
  @Roles('MENTOR', 'ADMIN')
  modifierLesson(
    @Param('id') formationId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: Partial<CreerLessonDto>,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.modifierLesson(formationId, lessonId, dto, req.user.payload.id, req.user.payload.role)
  }

  // DELETE /formations/:id/lessons/:lessonId — supprimer une leçon
  @Delete(':id/lessons/:lessonId')
  @Roles('MENTOR', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  supprimerLesson(
    @Param('id') formationId: string,
    @Param('lessonId') lessonId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.supprimerLesson(formationId, lessonId, req.user.payload.id, req.user.payload.role)
  }
}
