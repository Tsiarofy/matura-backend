import { Module } from '@nestjs/common'
import { ReunionsController } from './reunions.controller'
import { ReunionsService } from './reunions.service'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ReunionsController],
  providers: [ReunionsService],
})
export class ReunionsModule {}
