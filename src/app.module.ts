import { Module } from '@nestjs/common';
// import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
// import { ConfigModule } from '@nestjs/config';
// import { ProjetService } from './projet/projet.service';
// import { ProjetController } from './projet/projet.controller';
import { ProjetModule } from './projet/projet.module';
// import { EvaluationsModule } from './evaluations/evaluations.module';
//UserModule,, ProjetModule, EvaluationsModule
@Module({
  controllers: [],
  providers: [],
  imports: [PrismaModule,AuthModule,ProjetModule]
})
export class AppModule { }
