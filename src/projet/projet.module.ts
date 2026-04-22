import { Module } from '@nestjs/common'
import { ProjetController } from './projet.controller'
import { ProjetService } from './projet.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ProjetController],
  providers: [ProjetService],
  exports: [ProjetService],
})
export class ProjetModule {}
