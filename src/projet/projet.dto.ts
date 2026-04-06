import { PartialType } from "@nestjs/mapped-types";
import { IsDate, IsDateString, IsEmail, IsInt, IsNotEmpty, IsString } from "class-validator";

export class ProjetDto{
@IsString()
@IsNotEmpty()
titre:string;

@IsNotEmpty()
@IsString()
problematique:string 

@IsNotEmpty()
@IsString()
description:string;

@IsNotEmpty()
@IsString()
secteur :string 
 
@IsNotEmpty()
@IsString()
contexte  :string 

@IsNotEmpty()
@IsString()
objectifs :string 
}
export class UpdateDto extends PartialType(ProjetDto){}