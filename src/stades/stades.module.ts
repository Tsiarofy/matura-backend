// src/stades/stades.module.ts
// Déclare tous les Engines comme providers NestJS
// Importe GeoModule pour injecter GeoService dans Stade1Engine

import { Module } from '@nestjs/common'
import { StadesController, EvaluationsController } from './stades.controller'
import { StadesService } from './stades.service'
import { PrismaModule } from '../prisma/prisma.module'
import { GeoModule } from '../geo/geo.module'

// Engines
import { Stade1Engine } from './engines/stade1.engine'
import { Stade2Engine } from './engines/stade2.engine'
import { Stade3Engine } from './engines/stade3.engine'
import { Stade4Engine } from './engines/stade4.engine'
import { Stade5Engine } from './engines/stade5.engine'
import { Stade6Engine } from './engines/stade6.engine'
import { Stade7Engine } from './engines/stade7.engine'

@Module({
  imports: [
    PrismaModule,
    GeoModule, // Nécessaire pour Stade1Engine qui injecte GeoService
  ],
  controllers: [StadesController, EvaluationsController],
  providers: [
    StadesService,
    Stade1Engine,
    Stade2Engine,
    Stade3Engine,
    Stade4Engine,
    Stade5Engine,
    Stade6Engine,
    Stade7Engine,
  ],
  exports: [StadesService],
})
export class StadesModule {}
