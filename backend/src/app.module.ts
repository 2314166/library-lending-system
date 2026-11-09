import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { ClockModule } from './clock/clock.module';
import { FinesModule } from './fines/fines.module';
import { LoansModule } from './loans/loans.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule, ClockModule, SettingsModule,
    AuthModule, BooksModule, LoansModule, ReservationsModule, FinesModule, UsersModule,
  ],
})
export class AppModule {}
