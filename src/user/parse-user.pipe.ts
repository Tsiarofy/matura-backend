import { PipeTransform, Injectable, ArgumentMetadata, NotFoundException } from '@nestjs/common';
import { UserService } from "./user.service"

type UserDto=any
@Injectable()
export class ParseUserPipe implements PipeTransform<string, Promise<UserDto>> {
  // On injecte le service pour accéder à la base de données
  constructor(private readonly usersService: UserService) { }

  async transform(value: string, metadata: ArgumentMetadata): Promise<UserDto> {

    const user = await this.usersService.getUserByMail(value);

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'email ${value} introuvable`);
    }

    // 3. On retourne l'objet User complet
    // console.log("Utilisateur trouvé:", user);
    return user;
  }
}