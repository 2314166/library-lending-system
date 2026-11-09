import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({ imports: [ReservationsModule], controllers: [BooksController], providers: [BooksService] })
export class BooksModule {}
