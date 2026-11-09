import { Module } from '@nestjs/common';
import { FinesModule } from '../fines/fines.module';
import { LoansModule } from '../loans/loans.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({ imports: [LoansModule, FinesModule, ReservationsModule], controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
