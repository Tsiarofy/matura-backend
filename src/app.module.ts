import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjetModule } from './projet/projet.module';
import { StadesModule } from './stades/stades.module';
import { GeoModule } from './geo/geo.module';
import { AccompagnementModule } from './accompagnement/accompagnement.module';
import { UtilisateurModule } from './utilisateur/utilisateur.module';
import { FormationsModule } from './formations/formations.module';
import { AppController } from './app.controller';
import { AppService } from './app.service'; 
import { FinancementModule } from './financement/financement.module';
import { DocumentsModule } from './documents/documents.module';
import { MissionsModule } from './missions/missions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { ReunionsModule } from './reunions/reunions.module';

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
    FormationsModule,     // Endpoints /formations/* pour la gestion des formations
    FinancementModule,    // Endpoints /financements et /investisseur
    DocumentsModule,      // Gestion des documents/evidences
    MissionsModule,       // Gestion des missions par stade
    ScheduleModule.forRoot(),
    NotificationsModule,
    ReunionsModule,
  ],
})
export class AppModule {}
