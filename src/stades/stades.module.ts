import { Module } from '@nestjs/common'
import { StadesController, EvaluationsController } from './stades.controller'
import { StadesService } from './stades.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [StadesController, EvaluationsController],
  providers: [StadesService],
  exports: [StadesService],
})
export class StadesModule {}
