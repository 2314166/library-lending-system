import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt, Min } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { FinesService } from './fines.service';

class PaymentDto { @IsInt() @Min(1) amount: number }

@Controller('fines')
export class FinesController {
  constructor(private fines: FinesService) {}
  @Roles(Role.MEMBER) @Get('mine') mine(@CurrentUser() u: AuthUser) { return this.fines.mine(u.id); }
  @Roles(Role.LIBRARIAN) @Get() unpaid() { return this.fines.listUnpaid(); }
  @Roles(Role.LIBRARIAN) @Post(':id/payments')
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: PaymentDto, @CurrentUser() u: AuthUser) {
    return this.fines.pay(id, dto.amount, u.id);
  }
}
