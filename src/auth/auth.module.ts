import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import {JwtModule} from "@nestjs/jwt"
import { JwtStrategy } from './jwt.strategy';


@Module({
  imports:[PrismaModule,JwtModule.register({
      global: true, // Le rend disponible partout comme PrismaModule
      secret: process.env.SECRET_KEY, // On utilise ta variable du .env
      signOptions: { expiresIn: '1d' }, // Optionnel : durée du token
    })],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy]
})
export class AuthModule {}
