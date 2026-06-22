import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MissionsController } from './missions.controller'
import { MissionsService } from './missions.service'

@Module({
  imports: [PrismaModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
