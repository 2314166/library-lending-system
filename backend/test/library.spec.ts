import { ConflictException, ForbiddenException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ClockService } from '../src/clock/clock.service';
import { FinesService } from '../src/fines/fines.service';
import { LoansService } from '../src/loans/loans.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReservationsService } from '../src/reservations/reservations.service';
import { SettingsService } from '../src/settings/settings.service';
import { FakeClock } from './helpers/fake-clock';

const START = new Date('2026-01-01T09:00:00Z');
const DAY = 86_400_000;
const HOUR = 3_600_000;

describe('Library business rules (fixed clock, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let loans: LoansService;
  let reservations: ReservationsService;
  let fines: FinesService;
  let settings: SettingsService;
  const clock = new FakeClock(START);
  let n = 0;

  const user = (role: 'MEMBER' | 'LIBRARIAN' = 'MEMBER') =>
    prisma.user.create({ data: { name: `U${++n}`, email: `u${n}@t.test`, passwordHash: 'x', role } });
  const book = (copies: number) => prisma.book.create({ data: { title: `B${++n}`, author: 'A', totalCopies: copies } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ClockService).useValue(clock).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    loans = app.get(LoansService);
    reservations = app.get(ReservationsService);
    fines = app.get(FinesService);
    settings = app.get(SettingsService);
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "FinePayment","Fine","Reservation","Loan","Book","Setting","User" RESTART IDENTITY CASCADE');
    clock.set(START);
  });
  afterAll(() => app.close());

  it('checkout sets dueAt = now + configured loan period', async () => {
    await settings.update({ LOAN_PERIOD_DAYS: 10 });
    const m = await user(); const b = await book(1);
    const loan = await loans.checkout(m.id, b.id);
    expect(loan.dueAt.getTime()).toBe(START.getTime() + 10 * DAY);
  });

  it('enforces the maximum number of active loans', async () => {
    await settings.update({ MAX_ACTIVE_LOANS: 2 });
    const m = await user();
    const [b1, b2, b3] = [await book(1), await book(1), await book(1)];
    await loans.checkout(m.id, b1.id);
    await loans.checkout(m.id, b2.id);
    await expect(loans.checkout(m.id, b3.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks borrowing when unpaid fines exceed the threshold, and unblocks after payment', async () => {
    await settings.update({ BORROW_BLOCK_THRESHOLD: 1000 });
    const m = await user(); const lib = await user('LIBRARIAN');
    const b1 = await book(1); const b2 = await book(1);
    const loan = await loans.checkout(m.id, b1.id);
    clock.advance(24 * DAY); // 14-day period -> 10 days late -> 10 x 500 = 5000
    const res = await loans.returnLoan(loan.id);
    expect(res.fine!.amount).toBe(5000);
    await expect(loans.checkout(m.id, b2.id)).rejects.toBeInstanceOf(ForbiddenException);
    await fines.pay(res.fine!.id, 5000, lib.id);
    await expect(loans.checkout(m.id, b2.id)).resolves.toBeDefined();
  });

  it('return promotes the first queued member (FIFO with 3 members)', async () => {
    const [a, b, c] = [await user(), await user(), await user()];
    const bk = await book(1);
    const loan = await loans.checkout(a.id, bk.id);
    await reservations.reserve(b.id, bk.id);
    clock.advance(60_000);
    await reservations.reserve(c.id, bk.id);
    await loans.returnLoan(loan.id);
    const q = await reservations.queueFor(bk.id);
    expect(q.map((r) => [r.memberId, r.status])).toEqual([[b.id, 'READY'], [c.id, 'QUEUED']]);
  });

  it('hold expires after the window and passes to the next member', async () => {
    const [a, b, c] = [await user(), await user(), await user()];
    const bk = await book(1);
    const loan = await loans.checkout(a.id, bk.id);
    await reservations.reserve(b.id, bk.id);
    clock.advance(60_000);
    await reservations.reserve(c.id, bk.id);
    await loans.returnLoan(loan.id);
    clock.advance(48 * HOUR + 1000); // default hold window is 48h
    await reservations.sweep();
    const all = await prisma.reservation.findMany({ orderBy: { id: 'asc' } });
    expect(all.map((r) => r.status)).toEqual(['EXPIRED', 'READY']);
    expect(all[1].memberId).toBe(c.id);
  });

  it('a non-reserver cannot take a held copy', async () => {
    const [a, b, d] = [await user(), await user(), await user()];
    const bk = await book(1);
    const loan = await loans.checkout(a.id, bk.id);
    await reservations.reserve(b.id, bk.id);
    await loans.returnLoan(loan.id);
    await expect(loans.checkout(d.id, bk.id)).rejects.toBeInstanceOf(ConflictException);
    await expect(loans.checkout(b.id, bk.id)).resolves.toBeDefined();
  });

  it('two members cannot both get the last copy (concurrent checkout)', async () => {
    const [m1, m2] = [await user(), await user()];
    const bk = await book(1);
    const results = await Promise.allSettled([loans.checkout(m1.id, bk.id), loans.checkout(m2.id, bk.id)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(await prisma.loan.count({ where: { bookId: bk.id, returnedAt: null } })).toBe(1);
  });

  it('changing FINE_PER_DAY changes behaviour with no code change', async () => {
    await settings.update({ FINE_PER_DAY: 100 });
    const m = await user(); const bk = await book(1);
    const loan = await loans.checkout(m.id, bk.id);
    clock.advance(16 * DAY); // 2 days late
    const res = await loans.returnLoan(loan.id);
    expect(res.fine!.amount).toBe(200);
  });
});
