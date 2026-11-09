import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private users: UsersService) {}
  @Roles(Role.MEMBER) @Get('me/summary') me(@CurrentUser() u: AuthUser) { return this.users.summary(u.id); }
  @Roles(Role.LIBRARIAN) @Get('users') list() { return this.users.listMembers(); }
  @Roles(Role.LIBRARIAN) @Get('users/:id/summary') summary(@Param('id', ParseIntPipe) id: number) { return this.users.summary(id); }
}
