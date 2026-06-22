import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('miennes')
  getMiennes(@Req() req: any) {
    return this.service.getMiennes(req.user.payload.id)
  }

  @Get('miennes/non-lues')
  async compterNonLues(@Req() req: any) {
    const count = await this.service.compterNonLues(req.user.payload.id)
    return { count }
  }

  @Patch('miennes/tout-lire')
  toutLire(@Req() req: any) {
    return this.service.marquerToutesLues(req.user.payload.id)
  }

  @Patch(':id/lire')
  marquerLue(@Param('id') id: string, @Req() req: any) {
    return this.service.marquerLue(id, req.user.payload.id)
  }
}
