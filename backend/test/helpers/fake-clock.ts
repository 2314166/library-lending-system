import { ClockService } from '../../src/clock/clock.service';

export class FakeClock extends ClockService {
  constructor(private current: Date = new Date('2026-01-01T09:00:00Z')) { super(); }
  now(): Date { return new Date(this.current); }
  set(date: Date) { this.current = new Date(date); }
  advance(ms: number) { this.current = new Date(this.current.getTime() + ms); }
}
