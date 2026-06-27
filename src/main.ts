import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // app.enableCors({
  //   // 1. Remplace le '*' par l'URL exacte de ton front (Vite)
  //   origin: 'http://localhost:5173',

  //   // 2. Autorise impérativement l'envoi des cookies/headers d'auth
  //   credentials: true,

  //   // 3. (Optionnel) Liste les méthodes autorisées
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   allowedHeaders: 'Content-Type, Accept, Authorization',
  // });
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non décorées
      forbidNonWhitelisted: true, // Erreur si des propriétés non autorisées sont envoyées
      forbidUnknownValues: true,
    }),
  );

  app.use(cookieParser()); // Middleware pour parser les cookies

  // En production, Nginx sert /uploads/ directement (bypass Node.js).
  // En développement local, Express continue de servir les fichiers statiques.
  if (process.env.NODE_ENV !== 'production') {
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/',
    });
  }

  app.setGlobalPrefix('api'); // Ajoute un préfixe global pour toutes les routes (ex: /api)
  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();

// import { NestFactory } from '@nestjs/core'
// import { NestExpressApplication } from '@nestjs/platform-express'
// import { AppModule } from './app.module'
// import { join } from 'path'

// async function bootstrap() {
//   const app = await NestFactory.create<NestExpressApplication>(AppModule)

//   // Sert les fichiers statiques SAUF les vidéos (gérées par la route streaming)
//   app.useStaticAssets(join(__dirname, '..', 'uploads', 'avatars'), {
//     prefix: '/uploads/avatars',
//   })

//   app.enableCors({
//     origin: 'http://localhost:5173',
//     credentials: true,
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     allowedHeaders: 'Content-Type, Accept, Authorization',
//   })

//   await app.listen(3000)
// }
// bootstrap()
