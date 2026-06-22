import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

const TYPES_FICHIER = ['PDF', 'EXCEL', 'IMAGE', 'VIDEO'] as const

export class FichierRequisItemDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsIn(TYPES_FICHIER)
  type: (typeof TYPES_FICHIER)[number]

  @IsString()
  @MinLength(3)
  description: string

  @IsOptional()
  @IsInt()
  @Min(0)
  ordre?: number
}

export class MissionItemDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsString()
  @MinLength(3)
  titre: string

  @IsString()
  @MinLength(5)
  objectif: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FichierRequisItemDto)
  fichiers_requis: FichierRequisItemDto[]

  @IsOptional()
  @IsDateString()
  date_limite?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  ordre?: number
}

export class CreerMissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MissionItemDto)
  missions: MissionItemDto[]
}
