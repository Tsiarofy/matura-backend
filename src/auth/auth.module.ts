import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import {JwtModule} from "@nestjs/jwt"
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { PassportModule } from '@nestjs/passport';


@Module({
  imports:[PrismaModule,PassportModule,JwtModule.registerAsync({
  global: true,
  useFactory: async () => ({
    secret: process.env.JWT_ACCESS_SECRET,
    signOptions: { expiresIn: '15m' },
  }),
}),],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy, JwtRefreshStrategy]
})
export class AuthModule {}
