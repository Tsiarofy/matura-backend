import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjetModule } from './projet/projet.module';
import { StadesModule } from './stades/stades.module';
import { GeoModule } from './geo/geo.module';
import { AccompagnementModule } from './accompagnement/accompagnement.module';
import { UtilisateurModule } from './utilisateur/utilisateur.module';
import { AppController } from './app.controller';
import { AppService } from './app.service'; 
@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    PrismaModule,
    AuthModule,
    ProjetModule,
    StadesModule,
    GeoModule,           // Endpoints /api/geo/* + GeoService exporté vers Stade1Engine
    AccompagnementModule, // Endpoints /mentors, /demandes, /projets/:id/demandes
    UtilisateurModule,    // Endpoints /utilisateurs/* pour la gestion des profils
  ],
})
export class AppModule {}
