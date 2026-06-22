import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max, MaxLength } from 'class-validator'
import { DomainProjet, TypeCible } from '@prisma/client'

export class CreerFormationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titre?: string

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string

  @IsEnum(DomainProjet)
  domaine?: DomainProjet

  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  stade_cible?: number

  @IsEnum(TypeCible)
  @IsOptional()
  type_cible?: TypeCible
}
