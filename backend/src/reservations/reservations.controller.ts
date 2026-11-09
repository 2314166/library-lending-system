import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { ReservationsService } from './reservations.service';

class ReserveDto { @IsInt() bookId: number }

@Controller()
export class ReservationsController {
  constructor(private svc: ReservationsService) {}
  @Roles(Role.MEMBER) @Post('reservations') reserve(@Body() dto: ReserveDto, @CurrentUser() u: AuthUser) { return this.svc.reserve(u.id, dto.bookId); }
  @Roles(Role.MEMBER) @Delete('reservations/:id') cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.svc.cancel(id, u.id); }
  @Roles(Role.MEMBER) @Get('reservations/mine') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u.id); }
  @Roles(Role.LIBRARIAN) @Get('books/:id/queue') queue(@Param('id', ParseIntPipe) id: number) { return this.svc.queueFor(id); }
}
