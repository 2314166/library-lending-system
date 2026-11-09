import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClockService } from '../clock/clock.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinesService {
  constructor(private prisma: PrismaService, private clock: ClockService) {}

  async unpaidTotal(db: Prisma.TransactionClient, memberId: number): Promise<number> {
    const a = await db.fine.aggregate({ where: { memberId }, _sum: { amount: true, amountPaid: true } });
    return (a._sum.amount ?? 0) - (a._sum.amountPaid ?? 0);
  }

  mine(memberId: number) {
    return this.prisma.fine.findMany({
      where: { memberId },
      include: { loan: { include: { book: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listUnpaid() {
    return this.prisma.fine
      .findMany({ include: { member: { select: { id: true, name: true, email: true } }, loan: { include: { book: true } } }, orderBy: { createdAt: 'asc' } })
      .then((fines) => fines.filter((f) => f.amount > f.amountPaid));
  }

  async pay(fineId: number, amount: number, librarianId: number) {
    if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestException('Amount must be a positive integer (paise)');
    return this.prisma.$transaction(async (tx) => {
      // Lock the fine row so two simultaneous payments cannot overpay.
      const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "Fine" WHERE id = ${fineId} FOR UPDATE`;
      if (!rows.length) throw new NotFoundException('Fine not found');
      const fine = await tx.fine.findUniqueOrThrow({ where: { id: fineId } });
      const outstanding = fine.amount - fine.amountPaid;
      if (amount > outstanding) throw new BadRequestException(`Payment exceeds outstanding balance (${outstanding})`);
      await tx.finePayment.create({ data: { fineId, amount, recordedById: librarianId, paidAt: this.clock.now() } });
      return tx.fine.update({ where: { id: fineId }, data: { amountPaid: { increment: amount } } });
    });
  }
}
