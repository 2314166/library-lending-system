import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsInt } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { LoansService } from './loans.service';

class CheckoutDto { @IsInt() bookId: number }

@Controller('loans')
export class LoansController {
  constructor(private loans: LoansService) {}
  @Roles(Role.MEMBER) @Post('checkout') checkout(@Body() dto: CheckoutDto, @CurrentUser() u: AuthUser) { return this.loans.checkout(u.id, dto.bookId); }
  @Roles(Role.MEMBER) @Get('mine') mine(@CurrentUser() u: AuthUser) { return this.loans.mine(u.id); }
  @Roles(Role.LIBRARIAN) @Post(':id/return') ret(@Param('id', ParseIntPipe) id: number) { return this.loans.returnLoan(id); }
  @Roles(Role.LIBRARIAN) @Get() list(@Query('status') status?: string) { return this.loans.listAll(status); }
}
