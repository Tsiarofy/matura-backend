import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto, SessionDto, SignInDto, SingUpDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {Role} from "@prisma/client"

export type TypeToken={ access_token: string};
export type TypePayload={id:number,role:string}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  async signup(dto: SingUpDto) {
    // 1. On hash le mot de passe (comme en Node pur)
    console.log(dto.password)
    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.utilisateur.create({
        data: { 
           email: dto.email,
           password: hash,
           nom: dto.nom!,
           prenom:dto.prenom as string,
           role: dto.role || Role.PORT,
          region:dto.region,
          telephone:dto.telephone,
             
        }
      });

      return this.signToken(user);
    } catch (error) {
      if (error.code === 'P2002') throw new ForbiddenException('Email déjà pris');
      throw error;
    }
  }
  async singin(dto:SignInDto) {
    try {
      const user = await this.prisma.utilisateur.findUnique({
        where: {
          email: dto.email
        }
      })
      if(user){
        const passwordMatch = await bcrypt.compare(dto.password, user.password)
        if (!passwordMatch) throw new ForbiddenException('Mot de passe incorrect');
        return await this.signToken(user);
      }else{
        throw new ForbiddenException('Utilisateur introuvable');
      }

    } catch (error) {
      if (error.code === 'P2002') throw new ForbiddenException('Erreur durant la connexion');
      throw error;
    }
  }
  
  
   signToken(user: {id: number, email: string, nom: string, role: Role | null}):TypeToken{
    const payload = {
       id: user.id,
       email: user.email,
       nom: user.nom,
       role: user.role || Role.PORT
    };
    const token = this.jwt.sign(payload);
    return { access_token: token};
  }
}
