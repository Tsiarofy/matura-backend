// src/accompagnement/accompagnement.module.ts
import { Module } from '@nestjs/common'
import {
  DemandesProjetController,
  DemandesMentorController,
  MentorsController,
  ProjetsSuivisController,
} from './accompagnement.controller'
import { AccompagnementService } from './accompagnement.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [
    DemandesProjetController,
    DemandesMentorController,
    MentorsController,
    ProjetsSuivisController,
  ],
  providers: [AccompagnementService],
  exports: [AccompagnementService],
})
export class AccompagnementModule {}
