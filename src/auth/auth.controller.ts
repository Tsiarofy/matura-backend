import { Body, Controller, Post, HttpCode, 
    HttpStatus,  UseGuards,
    Res,Req,
    Delete} from '@nestjs/common';
import { AuthService } from './auth.service';
import {type InscriptionDto,type ConnexionDto,type AuthResponse} from "@matura/shared"
import path from 'path';
import { JwtRefreshAuthGuard } from './jwt-refresh.guard';
import {Request,Response} from 'express'

//   console.log(process.env.SECRET_KEY);

@Controller('auth')
export class AuthController {
    
    constructor(
        private readonly authService: AuthService,
      ) {}
    
    @Post("connexion")
  async  singin (@Body() dto:ConnexionDto, @Res({passthrough:true}) res:Response):Promise<AuthResponse> {
    // console.log("Avant le requete dans la db")  
    const data=await this.authService.connexion(dto)  
    // console.log("Apres le requete dans la db")  
    const secureCookie = process.env.COOKIE_SECURE === 'true';
    res.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  return {
    token: data.token,
    utilisateur: data.utilisateur,
    expire_dans: data.expire_dans,
  };
    }
    
    @Post("inscription")
    async singup (@Body() dto:InscriptionDto, @Res({passthrough:true}) res:Response):Promise<AuthResponse> {
        const data=await this.authService.inscription(dto)
        
    const secureCookie = process.env.COOKIE_SECURE === 'true';
    res.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  return {
    token: data.token,
    utilisateur: data.utilisateur,
    expire_dans: data.expire_dans,
  };
}  
    



@Post("rafraichir")
@UseGuards(JwtRefreshAuthGuard)
async refresh(
  @Req() req: Request, 
  @Res({ passthrough: true }) res: Response
): Promise<{token: string}> { // Utilise ton DTO de réponse (celui avec Zod ou une classe)

  const userId = (req.user as { id: string }).id;
  const oldRefreshToken = req.cookies['refresh_token'];

  return this.authService.refreshToken(userId, oldRefreshToken);
}

@Delete("deconnexion")
@UseGuards(JwtRefreshAuthGuard)
async logout(
  @Req() req: Request, 
  @Res({ passthrough: true }) res: Response
) {
  const userId = (req.user as { id: string }).id;
  await this.authService.deconnexion(userId);
  
  // Supprimer le cookie côté client
  const secureCookie = process.env.COOKIE_SECURE === 'true';
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: secureCookie,
    sameSite: secureCookie ? 'strict' : 'lax',
  });

  return { message: 'Déconnexion réussie' };
}   
}