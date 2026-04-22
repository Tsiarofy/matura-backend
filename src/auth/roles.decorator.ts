// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
// import { ClientRole } from './roles.enum';
import {RoleUtilisateur} from "@matura/shared"

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleUtilisateur []) => SetMetadata(ROLES_KEY, roles);