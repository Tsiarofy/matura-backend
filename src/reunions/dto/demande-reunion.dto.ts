import {
  IsString, IsEnum, IsOptional, IsDateString, IsNotEmpty,
} from 'class-validator'
import { TypeReunion } from '@prisma/client'

export class DemandeReunionDto {
  @IsString() @IsNotEmpty()
  participant_id: string

  @IsString() @IsNotEmpty()
  projet_id: string

  @IsEnum(TypeReunion)
  type: TypeReunion

  @IsOptional() @IsDateString()
  date_planifiee?: string | null

  @IsOptional() @IsString()
  message?: string | null
}
