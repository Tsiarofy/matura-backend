import { IsEmail, IsNotEmpty,
     IsString, MinLength,IsInt,
    Min,Max,isDate,
    IsEnum} from 'class-validator';
    
import {OmitType, PickType} from "@nestjs/mapped-types"
import {Role} from "@prisma/client"

// enum  UserRole {
//   PORT="port",
//   INV="inv",
//   MENTOR="mentor",
//   ADMIN="admin"
// } 



export class AuthDto {
  @IsInt({message:"L'id doit être un entier"})
  @Min(15,{message:"L'id doit être au moins 15"})
  @Max(100,{message:"L'id doit être au plus 100"})
  id:number;
   
  @IsNotEmpty({message:"le champs email ne peut pas etre vide"})
  @IsEmail()
  @IsNotEmpty({message:"L'email ne doit pas être vide"})    
  email:string;
  
  @IsNotEmpty({message:"le champs password ne peut pas etre vide"})
  @IsString({message:"Le mot de passe doit être une chaîne de caractères"})
  @MinLength(5,{message:"Le mot de passe doit comporter au moins 6 caractères"})
  password :string;
  
  @IsNotEmpty({message:"le champs nom ne peut pas etre vide"})
  @IsString({message:"Le nom doit être une chaîne de caractères"})
  nom:string;

  @IsNotEmpty({message:"le champs prenom ne peut pas etre vide"})
  @IsString({message:"Le prenom doit être une chaîne de caractères"})
  prenom:string;

  @IsString({message:"Le rôle doit être une chaîne de caractères"})
  @IsEnum(Role,{message:"Le rôle doit être l'un des suivants : port, inv, mentor, admin"})
  role:Role;
  
  @IsString({message:"doit etre une chaine de carractère"})
  region:string

  @IsString({message:'doit etre une chaine de carractere'})
  telephone: string

}



export class SignInDto extends PickType(AuthDto,["email","password",'role']){}
export class SingUpDto extends OmitType(AuthDto,['id']){}
export class SessionDto extends PickType(AuthDto,["id","email","nom","role"]) {}
