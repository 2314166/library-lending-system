import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({ controllers: [ReservationsController], providers: [ReservationsService, QueueService], exports: [ReservationsService, QueueService] })
export class ReservationsModule {}
