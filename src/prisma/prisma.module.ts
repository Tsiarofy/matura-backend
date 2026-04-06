// src/prismaRepo/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // <--- C'EST ICI ! Il faut exporter le SERVICE, pas le MODULE.
})
export class PrismaModule {}
