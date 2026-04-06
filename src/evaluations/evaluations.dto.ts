import { PartialType } from '@nestjs/mapped-types'
import {IsNotEmpty, IsString,} from 'class-validator'
export class CreateEvaluationDto {
  
  @IsNotEmpty()
  @IsString()
  description:string

  @IsNotEmpty()
  @IsString()
  note:number
}

export class UpdateEvauationDto extends PartialType(CreateEvaluationDto){}