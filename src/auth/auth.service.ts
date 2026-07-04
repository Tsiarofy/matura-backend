import { ForbiddenException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InscriptionDto, ConnexionDto, UtilisateurPublic, AuthResponse, PayloadDto } from "@matura/shared";
import * as bcrypt from 'bcrypt';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { RoleUtilisateur } from "@prisma/client"

export type TypeToken = { token: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  async inscription(dto: InscriptionDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const existingUser = await this.prisma.utilisateur.findUnique({
        where: { email: dto.email }
      });

      if (existingUser) {
        throw new ForbiddenException('Email déjà pris');
      }

      const user = await this.prisma.utilisateur.create({
        data: {
          email: dto.email,
          password: hash,
          nom: dto.nom,
          prenom: dto.prenom,
          role: dto.role || RoleUtilisateur.ENTREPRENEUR,
          
        }
      });

      const payload: PayloadDto = {
        id: user.id,
        email: user.email,
        prenom: user.prenom,
        role: user.role,
      };

      const signedToken = await this.signToken(payload);
      const refreshToken = await this.signToken(
        { id: user.id },
        '7d',
        process.env.JWT_REFRESH_SECRET,
      );

      // --- ENREGISTREMENT EN BASE ---
      await this.saveRefreshToken(user.id, refreshToken);

      const utilisateur: UtilisateurPublic = {
        id: user.id,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        role: user.role,
        statut_compte: user.statut_compte,
        url_avatar: user.url_avatar,
        cree_le: user.cree_le,
      };

      return {
        token: signedToken,
        refreshToken: refreshToken,
        utilisateur: utilisateur,
        expire_dans: 15 * 60,
      };
    } catch (error: any) {
      throw error;
    }
  }

  async connexion(dto: ConnexionDto) {
    try {
      const user = await this.prisma.utilisateur.findUnique({
        where: { email: dto.email },
      });

      if (user) {
        const passwordMatch = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatch) throw new ForbiddenException('Mot de passe incorrect');

        const payload: PayloadDto = {
          id: user.id,
          email: user.email,
          prenom: user.prenom,
          role: user.role,
        };

        const signedToken = await this.signToken(payload);
        const refreshToken = await this.signToken(
          { id: user.id },
          '7d',
          process.env.JWT_REFRESH_SECRET,
        );

        // --- ENREGISTREMENT EN BASE ---
        await this.saveRefreshToken(user.id, refreshToken);

        const utilisateur: UtilisateurPublic = {
          id: user.id,
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          role: user.role,
          statut_compte: user.statut_compte,
          url_avatar: user.url_avatar,
          cree_le: user.cree_le,
        };

        return {
          token: signedToken,
          refreshToken: refreshToken,
          utilisateur: utilisateur,
          expire_dans: 15 * 60,
        };
      } else {
        throw new ForbiddenException('Utilisateur introuvable');
      }
    } catch (error: any) {
      if (error.code === 'P2002') throw new ForbiddenException('Erreur durant la connexion');
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, error.status || 500);
    }
  }

 async deconnexion(userId: string) {
    // Invalidation de tous les tokens de l'utilisateur
    await this.prisma.tokenRefresh.updateMany({
      where: { utilisateur_id: userId, invalide: false },
      data: { invalide: true }
    });
    return { message: 'Déconnexion réussie' };
  }    

  /**
   * Enregistre le refresh token hasché en base.
   * On invalide les anciens tokens pour ce même utilisateur par sécurité.
   */
  async saveRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    
    // Invalidation des anciens tokens
    await this.prisma.tokenRefresh.updateMany({
      where: { utilisateur_id: userId, invalide: false },
      data: { invalide: true }
    });

    // Création du nouveau token
    await this.prisma.tokenRefresh.create({
      data: {
        token: hash,
        utilisateur_id: userId,
        expire_le: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      }
    });
  }

  async validateRefreshToken(userId: string, tokenFromCookie: string) {
    // On cherche le dernier token valide pour cet utilisateur
    const tokenRecord = await this.prisma.tokenRefresh.findFirst({
      where: {
        utilisateur_id: userId,
        invalide: false,
        expire_le: { gt: new Date() },
      },
      orderBy: { cree_le: 'desc' }
    });

    if (!tokenRecord || !(await bcrypt.compare(tokenFromCookie, tokenRecord.token))) {
      throw new UnauthorizedException('Session expirée ou invalide');
    }
    return true;
  }

  async refreshToken(userId: string, tokenRefresh: string): Promise<TypeToken> {
    // Vérification en base (haschage inclus)
    await this.validateRefreshToken(userId, tokenRefresh);

    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    // Génération d'un nouvel Access Token avec le payload complet
    const newAccessToken = await this.signToken({
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      role: user.role,
    });

    return { token: newAccessToken };
  }

  signToken(payload: any, expiresIn?: string, secretKey?: string): string {
    const options: JwtSignOptions = {
      secret: secretKey || process.env.JWT_ACCESS_SECRET,
    };

    if (expiresIn) {
      options.expiresIn = expiresIn as any;
    }

    return this.jwt.sign(payload, options);
  }
}
