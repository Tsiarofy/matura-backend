import {
  IsString, IsEnum, IsOptional, IsNumber,
  IsPositive, IsArray, IsDateString, Min, Max,
  MinLength, MaxLength,
} from 'class-validator';
import { TypeFinancement } from '@matura/shared';

// BUG FIX : ancienne version importait TypeFinancementOffre (PRET_HONNEUR, CAPITAL...)
// désormais aligné sur TypeFinancement du shared (PRET, EQUITY, OBLIGATION...)

export class CreerOffreDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  titre: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsEnum(TypeFinancement)
  typeFinancement: TypeFinancement;

  @IsNumber()
  @Min(1)
  @Max(9)
  stadeCible: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  montantMin?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  montantMax?: number;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secteurs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsDateString()
  dateCloture?: string;
}
