import { Module } from '@nestjs/common';
import { FinancementController, InvestisseurController } from './financement.controller';
import { FinancementService } from './financement.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinancementController, InvestisseurController],
  providers: [FinancementService],
  exports: [FinancementService],
})
export class FinancementModule {}
