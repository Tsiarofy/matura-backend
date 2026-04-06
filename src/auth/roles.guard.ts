import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {ClientRole  } from './roles.enum';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {} // Le Reflector lit les métadonnées

  canActivate(context: ExecutionContext): boolean {
    // 1. Récupérer les rôles définis sur la route via le décorateur @Roles
    const requiredRoles = this.reflector.getAllAndOverride<ClientRole []>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si aucun rôle n'est requis, on laisse passer
    if (!requiredRoles) {
      return true;
    }

    // 2. Récupérer l'utilisateur depuis la requête (injecté par Passport)
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.payload?.role?.includes(role));
  }
}