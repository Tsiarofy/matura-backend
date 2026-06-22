import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService]
})
export class DocumentsModule {}
