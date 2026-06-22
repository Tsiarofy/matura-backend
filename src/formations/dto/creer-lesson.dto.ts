import { IsString, IsNotEmpty, IsInt, Min, MaxLength, Matches } from 'class-validator'

export class CreerLessonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titre: string

  @IsInt()
  @Min(1)
  ordre: number

  @IsString()
  @IsNotEmpty()
  contenu_texte: string  // Markdown accepté, pas de limite stricte

  @IsString()
  @IsNotEmpty()
  @Matches(/^(https?:\/\/.+|\/.+)$/, {
    message: "url_video doit être une URL (http/https) ou un chemin local commençant par /",
  })
  url_video: string
}
