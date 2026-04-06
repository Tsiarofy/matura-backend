import { ValidationPipe } from '@nestjs/common';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import cooki

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Permet les requêtes cross-origin (CORS)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Supprime les propriétés non décorées
    forbidNonWhitelisted: true, // Erreur si des propriétés non autorisées sont envoyées
    forbidUnknownValues:true,
    
  }));
  app.setGlobalPrefix('api'); // Ajoute un préfixe global pour toutes les routes (ex: /api)
  await app.listen(3000);
}
bootstrap();
