// Shapes below match what the NestJS backend actually returns.
// Money is always in paise (100 paise = Rs 1).

export type Role = 'MEMBER' | 'LIBRARIAN';

export interface AuthUser { id: number; name: string; email: string; role: Role }
export interface AuthResponse { accessToken: string; user: AuthUser }

export interface BookBase { id: number; title: string; author: string; genre: string | null; totalCopies: number }
export interface Book extends BookBase { available: number; queueLength: number }
export interface BookInput { title: string; author: string; genre?: string; totalCopies: number }

export interface MemberRef { id: number; name: string; email: string }

export interface Loan {
  id: number; bookId: number; memberId: number;
  borrowedAt: string; dueAt: string; returnedAt: string | null;
  book: BookBase; overdue: boolean; daysOverdue: number;
  member?: MemberRef;
}

export type ReservationStatus = 'QUEUED' | 'READY' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
export interface Reservation {
  id: number; bookId: number; memberId: number; status: ReservationStatus;
  createdAt: string; readyAt: string | null; holdExpiresAt: string | null;
  book: BookBase; position: number;
}
export interface QueueEntry {
  id: number; bookId: number; status: ReservationStatus; createdAt: string;
  holdExpiresAt: string | null; member: MemberRef;
}

export interface FinePayment { id: number; amount: number; paidAt: string }
export interface Fine {
  id: number; loanId: number; memberId: number; daysLate: number;
  amount: number; amountPaid: number; createdAt: string;
  loan?: { book: BookBase; dueAt: string; returnedAt: string | null };
  payments?: FinePayment[];
  member?: MemberRef;
}

export interface ReturnResult { loanId: number; returnedAt: string; daysLate: number; fine: Fine | null }

export interface MemberRow extends MemberRef { activeLoans: number; unpaidFines: number; blocked: boolean }
export interface MemberSummary {
  user: AuthUser; loans: Loan[]; fines: Fine[]; reservations: Reservation[];
  unpaidFines: number; blocked: boolean;
  limits: { maxActiveLoans: number; blockThreshold: number };
}

export interface Settings {
  LOAN_PERIOD_DAYS: number; FINE_PER_DAY: number; FINE_CAP: number;
  MAX_ACTIVE_LOANS: number; BORROW_BLOCK_THRESHOLD: number; HOLD_WINDOW_HOURS: number;
}
