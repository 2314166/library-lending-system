import { Injectable } from '@nestjs/common';

/** The only place allowed to call new Date(). Tests replace it with FakeClock. */
@Injectable()
export class ClockService {
  now(): Date { return new Date(); }
}
