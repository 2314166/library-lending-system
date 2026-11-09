import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Book } from '@prisma/client';
import { ClockService } from '../clock/clock.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../reservations/queue.service';
import { CreateBookDto, UpdateBookDto } from './books.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService, private clock: ClockService, private queue: QueueService) {}

  private async withAvailability(books: Book[]) {
    const ids = books.map((b) => b.id);
    const loans = await this.prisma.loan.groupBy({ by: ['bookId'], where: { bookId: { in: ids }, returnedAt: null }, _count: true });
    const held = await this.prisma.reservation.groupBy({ by: ['bookId'], where: { bookId: { in: ids }, status: 'READY' }, _count: true });
    const queued = await this.prisma.reservation.groupBy({ by: ['bookId'], where: { bookId: { in: ids }, status: 'QUEUED' }, _count: true });
    const n = (rows: { bookId: number; _count: number }[], id: number) => rows.find((r) => r.bookId === id)?._count ?? 0;
    return books.map((b) => ({
      ...b,
      available: b.totalCopies - n(loans, b.id) - n(held, b.id),
      queueLength: n(queued, b.id),
    }));
  }

  async list(q?: string) {
    const books = await this.prisma.book.findMany({
      where: q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { author: { contains: q, mode: 'insensitive' } }] } : {},
      orderBy: { title: 'asc' },
    });
    return this.withAvailability(books);
  }

  async get(id: number) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return (await this.withAvailability([book]))[0];
  }

  create(dto: CreateBookDto) { return this.prisma.book.create({ data: dto }); }

  async update(id: number, dto: UpdateBookDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.queue.lockBook(tx, id);
      if (dto.totalCopies !== undefined) {
        const { active, ready } = await this.queue.availability(tx, id);
        if (dto.totalCopies < active + ready)
          throw new ConflictException(`Cannot go below ${active + ready} copies (on loan or held)`);
      }
      const book = await tx.book.update({ where: { id }, data: dto });
      await this.queue.rebalance(tx, id, this.clock.now()); // more copies may release queued members
      return book;
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.queue.lockBook(tx, id);
      const history = (await tx.loan.count({ where: { bookId: id } })) + (await tx.reservation.count({ where: { bookId: id } }));
      if (history > 0) throw new ConflictException('Book has loan/reservation history. Set copies to 0 instead.');
      await tx.book.delete({ where: { id } });
      return { deleted: true };
    });
  }
}
