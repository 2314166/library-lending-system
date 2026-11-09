import { DAY_MS } from '../common/constants';

/** Pure function: a part-day late counts as a full day; total is capped. */
export function calculateFine(dueAt: Date, returnedAt: Date, perDay: number, cap: number) {
  const late = returnedAt.getTime() - dueAt.getTime();
  const daysLate = late > 0 ? Math.ceil(late / DAY_MS) : 0;
  return { daysLate, amount: Math.min(daysLate * perDay, cap) };
}
