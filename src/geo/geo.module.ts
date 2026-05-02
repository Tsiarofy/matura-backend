// src/geo/geo.module.ts
import { Module } from '@nestjs/common'
import { GeoController } from './geo.controller'
import { GeoService } from './geo.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService], // Exporté pour injection dans Stade1Engine
})
export class GeoModule {}
