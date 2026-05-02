import { Body, Controller, Get, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { UtilisateurService } from './utilisateur.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('utilisateurs')
@UseGuards(JwtAuthGuard)
export class UtilisateurController {
  constructor(private readonly utilisateurService: UtilisateurService) {}

  // GET /utilisateurs/moi - Récupérer mon profil complet
// type RequestPayload<>={}

  @Get('moi')
  getMonProfil(@Request() req: { user:{ payload:{ id: string } }}) {
    // console.log("RECUPERATION DES IP - - - - - - - - - -- - - --")
    // console.log(req.user)
    return this.utilisateurService.getProfilComplet(req.user.payload.id);
  }

  // PATCH /utilisateurs/moi - Mettre à jour mon profil
  @Patch('moi')
  majMonProfil(
    @Request() req: { user: {payload:{ id: string, role: string } } },
    @Body() dto: any,
  ) {
    return this.utilisateurService.majProfil(req.user.payload.id, req.user.payload.role, dto);
  }

  // PATCH /utilisateurs/moi/avatar - Mettre à jour mon avatar
  @Patch('moi/avatar')
  majAvatar(
    @Request() req: { user: {payload:{ id: string }}},
    @Body() body: { url_avatar: string }
  ) {
    return this.utilisateurService.majAvatar(req.user.payload.id, body.url_avatar);
  }

  // GET /utilisateurs/:id/public - Profil public (pour annuaire mentors)
  @Get(':id/public')
  getProfilPublic(@Param('id') id: string) {
    return this.utilisateurService.getProfilPublic(id);
  }
}
