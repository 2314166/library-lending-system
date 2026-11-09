import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Role } from '@prisma/client';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export interface AuthUser { id: number; role: Role; email: string; name: string }
export const CurrentUser = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
