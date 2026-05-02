import { ValidationPipe } from '@nestjs/common';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    // 1. Remplace le '*' par l'URL exacte de ton front (Vite)
    origin: 'http://localhost:5173', 
    
    // 2. Autorise impérativement l'envoi des cookies/headers d'auth
    credentials: true,
    
    // 3. (Optionnel) Liste les méthodes autorisées
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Supprime les propriétés non décorées
    forbidNonWhitelisted: true, // Erreur si des propriétés non autorisées sont envoyées
    forbidUnknownValues:true,
    
  }));

  app.use(cookieParser()); // Middleware pour parser les cookies
  
  // Serve static files from the 'uploads' folder
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api'); // Ajoute un préfixe global pour toutes les routes (ex: /api)
  await app.listen(3000);
}
bootstrap();

