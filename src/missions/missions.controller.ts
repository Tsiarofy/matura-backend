import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import type { Request } from 'express'
import * as fs from 'fs'
import { extname } from 'path'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CreerMissionsDto } from './dto/creer-missions.dto'
import { EvaluerMissionDto } from './dto/evaluer-mission.dto'
import { MissionsService } from './missions.service'

const uploadDir = './uploads/missions'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

interface RequestWithUser extends Request {
  user: {
    payload: {
      id: string
      email: string
      role: string
    }
  }
}

/** Détermine le type normalisé d'un fichier à partir de son extension. */
function detecterTypeFichier(filename: string): string {
  const ext = extname(filename).toLowerCase()
  if (ext === '.pdf') return 'PDF'
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'IMAGE'
  if (['.mp4', '.avi', '.mov', '.webm'].includes(ext)) return 'VIDEO'
  if (['.xlsx', '.xls', '.csv'].includes(ext)) return 'EXCEL'
  return 'AUTRE'
}

@Controller('projets/:projetId/stades/:num/missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  getMissions(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Req() req: RequestWithUser,
  ) {
    return this.missionsService.getMissions(projetId, num, req.user.payload.id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  creerMissions(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Req() req: RequestWithUser,
    @Body() body: CreerMissionsDto,
  ) {
    return this.missionsService.creerMissions(
      projetId,
      num,
      req.user.payload.id,
      body.missions ?? [],
    )
  }

  @Get(':missionId')
  async getMissionDetail(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Param('missionId') missionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.missionsService.getMissionDetail(projetId, num, missionId, req.user.payload.id)
  }

  /**
   * POST /projets/:projetId/stades/:num/missions/:missionId/soumettre
   *
   * Body multipart/form-data :
   *   - fichier_<fichierRequisId> : le fichier correspondant à chaque FichierRequisMission
   *   - commentaire (optionnel) : texte libre
   *
   * Le nom du champ fichier doit correspondre exactement à l'id du FichierRequisMission
   * côté frontend (via FormData.append(`fichier_${fr.id}`, file)).
   * On accepte jusqu'à 20 fichiers, 50 Mo chacun.
   */
  @Post(':missionId/soumettre')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'fichiers', maxCount: 20 },
        { name: 'fichiers_supplementaires', maxCount: 20 },
      ],
      {
        storage: diskStorage({
          destination: uploadDir,
          filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
            cb(null, `${unique}${extname(file.originalname)}`)
          },
        }),
        limits: { fileSize: 100 * 1024 * 1024 }, // 100 Mo
      },
    ),
  )
  async soumettreReponse(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Param('missionId') missionId: string,
    @Req() req: RequestWithUser,
    @Body() body: { commentaire?: string; fichiers_requis_ids?: string },
    @UploadedFiles() files: { fichiers?: Express.Multer.File[]; fichiers_supplementaires?: Express.Multer.File[] },
  ) {
    const requiredFiles = files.fichiers || []
    const extraFiles = files.fichiers_supplementaires || []
    // fichiers_requis_ids est un JSON stringifié : ["id1", "id2", ...]
    // transmis en parallel avec les fichiers dans le FormData
    let fichiersRequisIds: string[] = []
    if (body.fichiers_requis_ids) {
      try {
        fichiersRequisIds = JSON.parse(body.fichiers_requis_ids)
      } catch {
        throw new BadRequestException('FICHIERS_REQUIS_IDS_INVALIDE')
      }
    }

    if (requiredFiles.length !== fichiersRequisIds.length) {
      throw new BadRequestException('NOMBRE_FICHIERS_INVALIDE')
    }

    // Construire le map { fichierRequisId -> { url, nom, type, taille } }
    const fichiersMap: Record<string, { url: string; nom: string; type: string; taille: number }> = {}
    for (let i = 0; i < fichiersRequisIds.length; i++) {
      const file = requiredFiles[i]
      const id = fichiersRequisIds[i]
      fichiersMap[id] = {
        url: `/uploads/missions/${file.filename}`,
        nom: file.originalname,
        type: detecterTypeFichier(file.originalname),
        taille: file.size,
      }
    }

    const fichiersSupMap = extraFiles.map((file) => ({
      url: `/uploads/missions/${file.filename}`,
      nom: file.originalname,
      type: detecterTypeFichier(file.originalname),
      taille: file.size,
    }))

    return this.missionsService.soumettreReponse(
      projetId,
      num,
      missionId,
      req.user.payload.id,
      fichiersMap,
      fichiersSupMap,
      body?.commentaire,
    )
  }

  @Post(':missionId/evaluer')
  @HttpCode(HttpStatus.OK)
  evaluerMission(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Param('missionId') missionId: string,
    @Req() req: RequestWithUser,
    @Body() body: EvaluerMissionDto,
  ) {
    return this.missionsService.evaluerMission(
      projetId,
      num,
      missionId,
      req.user.payload.id,
      body,
    )
  }

  @Delete(':missionId')
  supprimerMission(
    @Param('projetId') projetId: string,
    @Param('num', ParseIntPipe) num: number,
    @Param('missionId') missionId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.missionsService.supprimerMission(
      projetId,
      num,
      missionId,
      req.user.payload.id,
    )
  }
}
