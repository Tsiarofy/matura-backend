
import { ExtractJwt, Strategy,StrategyOptions } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {PayloadDto} from '@matura/shared'
import {type Request } from 'express';
import * as bcrypt from "bcrypt"
import {PrismaService} from "@/prisma/prisma.service"

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy,"jwt-refresh") {
  constructor(private readonly prisma:PrismaService) {
    super({
      jwtFromRequest: ExtractFromRequest,
      ignoreExpiration: false,
      secretOrKey:process.env.JWT_REFRESH_SECRET as string,
      passReqToCallback: true,
    });
  }

async validate(req: Request, payload: PayloadDto) {
  const refreshToken = req.cookies?.refresh_token; // Récupération brute
  const userId = payload.id;

  // 1. Chercher en base avec Prisma
  const userToken = await this.prisma.tokenRefresh.findFirst({
    where: { utilisateur_id: userId, invalide: false }
  });

  if (!userToken || !(await bcrypt.compare(refreshToken, userToken.token))) {
    throw new UnauthorizedException("Session expirée ou piratée");
  }

  return { id: userId }; // Sera attaché à req.user

  }
}

const ExtractFromRequest=(req:Request)=>{
  let token=null;
    if(req && req.cookies){
        token=req.cookies['refresh_token']
    }
    return token;
}


