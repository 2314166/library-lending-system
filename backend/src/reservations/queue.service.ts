import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HOUR_MS } from '../common/constants';
import { SettingsService } from '../settings/settings.service';

/**
 * Shared by loans, reservations and books. Every mutation of a book's stock or queue
 * must: lockBook() first, then rebalance() before deciding anything.
 */
@Injectable()
export class QueueService {
  constructor(private settings: SettingsService) {}

  /** Row lock: serialises all work on one book, so the last copy cannot be taken twice. */
  async lockBook(tx: Prisma.TransactionClient, bookId: number) {
    const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "Book" WHERE id = ${bookId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Book not found');
  }

  /** available = total - active loans - copies held for someone. Derived, never stored. */
  async availability(tx: Prisma.TransactionClient, bookId: number) {
    const book = await tx.book.findUniqueOrThrow({ where: { id: bookId } });
    const active = await tx.loan.count({ where: { bookId, returnedAt: null } });
    const ready = await tx.reservation.count({ where: { bookId, status: 'READY' } });
    return { total: book.totalCopies, active, ready, available: book.totalCopies - active - ready };
  }

  /** Expire stale holds, then give any free copies to the oldest queued members. */
  async rebalance(tx: Prisma.TransactionClient, bookId: number, now: Date) {
    await tx.reservation.updateMany({
      where: { bookId, status: 'READY', holdExpiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    const { available } = await this.availability(tx, bookId);
    if (available <= 0) return;
    const cfg = await this.settings.all(tx);
    const next = await tx.reservation.findMany({
      where: { bookId, status: 'QUEUED' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: available,
    });
    for (const r of next) {
      await tx.reservation.update({
        where: { id: r.id },
        data: { status: 'READY', readyAt: now, holdExpiresAt: new Date(now.getTime() + cfg.HOLD_WINDOW_HOURS * HOUR_MS) },
      });
    }
  }
}
