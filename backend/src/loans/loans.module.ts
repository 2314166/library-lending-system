import { Module } from '@nestjs/common';
import { FinesModule } from '../fines/fines.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({ imports: [ReservationsModule, FinesModule], controllers: [LoansController], providers: [LoansService], exports: [LoansService] })
export class LoansModule {}
