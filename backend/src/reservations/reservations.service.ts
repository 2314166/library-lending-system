import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClockService } from '../clock/clock.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from './queue.service';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService, private clock: ClockService, private queue: QueueService) {}

  async reserve(memberId: number, bookId: number) {
    return this.prisma.$transaction(async (tx) => {
      const now = this.clock.now();
      await this.queue.lockBook(tx, bookId);
      await this.queue.rebalance(tx, bookId, now);
      if (await tx.loan.findFirst({ where: { bookId, memberId, returnedAt: null } }))
        throw new ConflictException('You already have this book on loan');
      if (await tx.reservation.findFirst({ where: { bookId, memberId, status: { in: ['QUEUED', 'READY'] } } }))
        throw new ConflictException('You already have an active reservation for this book');
      const { available } = await this.queue.availability(tx, bookId);
      if (available > 0) throw new ConflictException('A copy is available. Check it out instead.');
      return tx.reservation.create({ data: { bookId, memberId, createdAt: now } });
    });
  }

  async cancel(reservationId: number, memberId: number) {
    const pre = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!pre) throw new NotFoundException('Reservation not found');
    if (pre.memberId !== memberId) throw new ForbiddenException('Not your reservation'); // ownership check
    return this.prisma.$transaction(async (tx) => {
      await this.queue.lockBook(tx, pre.bookId);
      const r = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });
      if (!['QUEUED', 'READY'].includes(r.status)) throw new BadRequestException('Reservation is no longer active');
      const updated = await tx.reservation.update({ where: { id: r.id }, data: { status: 'CANCELLED' } });
      await this.queue.rebalance(tx, r.bookId, this.clock.now()); // a freed hold passes to the next member
      return updated;
    });
  }

  async mine(memberId: number) {
    const rows = await this.prisma.reservation.findMany({
      where: { memberId, status: { in: ['QUEUED', 'READY'] } },
      include: { book: true },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        position:
          r.status === 'QUEUED'
            ? 1 + (await this.prisma.reservation.count({
                where: { bookId: r.bookId, status: 'QUEUED', OR: [{ createdAt: { lt: r.createdAt } }, { createdAt: r.createdAt, id: { lt: r.id } }] },
              }))
            : 0,
      })),
    );
  }

  queueFor(bookId: number) {
    return this.prisma.reservation.findMany({
      where: { bookId, status: { in: ['QUEUED', 'READY'] } },
      include: { member: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  /** Tidy-up only. Correctness never depends on this: every checkout/reserve rebalances first. */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweep() {
    const now = this.clock.now();
    const due = await this.prisma.reservation.findMany({
      where: { status: 'READY', holdExpiresAt: { lte: now } },
      select: { bookId: true },
      distinct: ['bookId'],
    });
    for (const { bookId } of due) {
      await this.prisma.$transaction(async (tx) => {
        await this.queue.lockBook(tx, bookId);
        await this.queue.rebalance(tx, bookId, now);
      });
    }
  }
}
