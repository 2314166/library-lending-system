import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DAY_MS } from '../common/constants';
import { ClockService } from '../clock/clock.service';
import { FinesService } from '../fines/fines.service';
import { calculateFine } from '../fines/fine-calculator';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../reservations/queue.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class LoansService {
  constructor(
    private prisma: PrismaService,
    private clock: ClockService,
    private queue: QueueService,
    private settings: SettingsService,
    private fines: FinesService,
  ) {}

  async checkout(memberId: number, bookId: number) {
    return this.prisma.$transaction(async (tx) => {
      const now = this.clock.now();
      await this.queue.lockBook(tx, bookId);
      await this.queue.rebalance(tx, bookId, now);
      const cfg = await this.settings.all(tx);

      const unpaid = await this.fines.unpaidTotal(tx, memberId);
      if (unpaid > cfg.BORROW_BLOCK_THRESHOLD)
        throw new ForbiddenException(`Borrowing blocked: unpaid fines (${unpaid}) exceed the limit (${cfg.BORROW_BLOCK_THRESHOLD})`);

      const active = await tx.loan.count({ where: { memberId, returnedAt: null } });
      if (active >= cfg.MAX_ACTIVE_LOANS) throw new ConflictException(`Maximum of ${cfg.MAX_ACTIVE_LOANS} active loans reached`);
      if (await tx.loan.findFirst({ where: { memberId, bookId, returnedAt: null } }))
        throw new ConflictException('You already have this book on loan');

      const held = await tx.reservation.findFirst({ where: { bookId, memberId, status: 'READY' } });
      if (held) {
        await tx.reservation.update({ where: { id: held.id }, data: { status: 'FULFILLED' } });
      } else {
        // After rebalance, available > 0 implies nobody is waiting, so no queue-jumping is possible.
        const { available } = await this.queue.availability(tx, bookId);
        if (available <= 0) throw new ConflictException('No copy available. Join the reservation queue.');
      }
      return tx.loan.create({
        data: { bookId, memberId, borrowedAt: now, dueAt: new Date(now.getTime() + cfg.LOAN_PERIOD_DAYS * DAY_MS) },
        include: { book: true },
      });
    });
  }

  async returnLoan(loanId: number) {
    const pre = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!pre) throw new NotFoundException('Loan not found');
    return this.prisma.$transaction(async (tx) => {
      await this.queue.lockBook(tx, pre.bookId);
      const loan = await tx.loan.findUniqueOrThrow({ where: { id: loanId } });
      if (loan.returnedAt) throw new ConflictException('Loan already returned');
      const now = this.clock.now();
      const cfg = await this.settings.all(tx);
      const { daysLate, amount } = calculateFine(loan.dueAt, now, cfg.FINE_PER_DAY, cfg.FINE_CAP);
      await tx.loan.update({ where: { id: loanId }, data: { returnedAt: now } });
      const fine = amount > 0 ? await tx.fine.create({ data: { loanId, memberId: loan.memberId, daysLate, amount, createdAt: now } }) : null;
      await this.queue.rebalance(tx, loan.bookId, now); // hold the copy for the first queued member
      return { loanId, returnedAt: now, daysLate, fine };
    });
  }

  private decorate<T extends { dueAt: Date; returnedAt: Date | null }>(l: T) {
    const now = this.clock.now();
    const overdue = !l.returnedAt && l.dueAt < now;
    return { ...l, overdue, daysOverdue: overdue ? Math.ceil((now.getTime() - l.dueAt.getTime()) / DAY_MS) : 0 };
  }

  async mine(memberId: number) {
    const loans = await this.prisma.loan.findMany({ where: { memberId, returnedAt: null }, include: { book: true }, orderBy: { dueAt: 'asc' } });
    return loans.map((l) => this.decorate(l));
  }

  async listAll(status?: string) {
    const now = this.clock.now();
    const where =
      status === 'overdue' ? { returnedAt: null, dueAt: { lt: now } } : status === 'active' ? { returnedAt: null } : {};
    const loans = await this.prisma.loan.findMany({
      where,
      include: { book: true, member: { select: { id: true, name: true, email: true } } },
      orderBy: { dueAt: 'asc' },
    });
    return loans.map((l) => this.decorate(l));
  }
}
