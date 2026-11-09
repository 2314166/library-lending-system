import { calculateFine } from '../src/fines/fine-calculator';

const DAY = 86_400_000;
const due = new Date('2026-01-15T09:00:00Z');

describe('calculateFine (pure, fixed dates)', () => {
  it('returned on time -> no fine', () => {
    expect(calculateFine(due, due, 500, 20000)).toEqual({ daysLate: 0, amount: 0 });
    expect(calculateFine(due, new Date(due.getTime() - DAY), 500, 20000).amount).toBe(0);
  });
  it('3 days late -> 3 x fine per day', () => {
    expect(calculateFine(due, new Date(due.getTime() + 3 * DAY), 500, 20000)).toEqual({ daysLate: 3, amount: 1500 });
  });
  it('late beyond the cap -> fine equals the cap', () => {
    expect(calculateFine(due, new Date(due.getTime() + 100 * DAY), 500, 20000).amount).toBe(20000);
  });
  it('a part-day late counts as a full day', () => {
    expect(calculateFine(due, new Date(due.getTime() + 1000), 500, 20000).daysLate).toBe(1);
    expect(calculateFine(due, new Date(due.getTime() + DAY + 1000), 500, 20000).daysLate).toBe(2);
  });
});
