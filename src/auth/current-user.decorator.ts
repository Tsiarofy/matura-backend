import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Si on a spécifié une propriété (ex: 'id'), on la retourne
    // Sinon on retourne l'objet payload entier
    return data ? user?.payload?.[data] : user?.payload;
  },
);
