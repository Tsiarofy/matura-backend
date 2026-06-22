import { IsString, IsOptional, MaxLength } from 'class-validator';

export class PostulerDto {
  @IsString()
  projetId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  messageMotivation?: string;
}
