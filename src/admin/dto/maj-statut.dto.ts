import { StatutCompte } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class MajStatutDto {
  @IsEnum(StatutCompte)
  statut: StatutCompte;

  @IsOptional()
  @IsString()
  motif?: string;
}
