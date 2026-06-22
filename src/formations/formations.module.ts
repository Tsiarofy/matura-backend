import { Module } from '@nestjs/common'
import { FormationsController } from './formations.controller'
import { FormationsService } from './formations.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [FormationsController],
  providers: [FormationsService],
  exports: [FormationsService],
})
export class FormationsModule {}
