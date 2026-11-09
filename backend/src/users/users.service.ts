import { Injectable, NotFoundException } from '@nestjs/common';
import { FinesService } from '../fines/fines.service';
import { LoansService } from '../loans/loans.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private loans: LoansService,
    private fines: FinesService,
    private reservations: ReservationsService,
    private settings: SettingsService,
  ) {}

  async listMembers() {
    const cfg = await this.settings.all();
    const members = await this.prisma.user.findMany({ where: { role: 'MEMBER' }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
    return Promise.all(
      members.map(async (m) => {
        const unpaid = await this.fines.unpaidTotal(this.prisma, m.id);
        const activeLoans = await this.prisma.loan.count({ where: { memberId: m.id, returnedAt: null } });
        return { ...m, activeLoans, unpaidFines: unpaid, blocked: unpaid > cfg.BORROW_BLOCK_THRESHOLD };
      }),
    );
  }

  /** The "member page": active loans, due dates, fines, reservations. */
  async summary(memberId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: memberId }, select: { id: true, name: true, email: true, role: true } });
    if (!user) throw new NotFoundException('User not found');
    const cfg = await this.settings.all();
    const [loans, fines, reservations, unpaid] = await Promise.all([
      this.loans.mine(memberId),
      this.fines.mine(memberId),
      this.reservations.mine(memberId),
      this.fines.unpaidTotal(this.prisma, memberId),
    ]);
    return {
      user, loans, fines, reservations,
      unpaidFines: unpaid,
      blocked: unpaid > cfg.BORROW_BLOCK_THRESHOLD,
      limits: { maxActiveLoans: cfg.MAX_ACTIVE_LOANS, blockThreshold: cfg.BORROW_BLOCK_THRESHOLD },
    };
  }
}
