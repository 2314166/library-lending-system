import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SETTING_DEFAULTS, SettingKey, Settings } from './settings.defaults';

const MIN_ONE: SettingKey[] = ['LOAN_PERIOD_DAYS', 'MAX_ACTIVE_LOANS', 'HOLD_WINDOW_HOURS'];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Read on every operation so a change takes effect immediately, with no restart. */
  async all(db: Prisma.TransactionClient = this.prisma): Promise<Settings> {
    const out: Settings = { ...SETTING_DEFAULTS };
    for (const r of await db.setting.findMany()) if (r.key in out) out[r.key as SettingKey] = r.value;
    return out;
  }

  async update(changes: Record<string, unknown>): Promise<Settings> {
    const entries = Object.entries(changes ?? {});
    if (!entries.length) throw new BadRequestException('No settings supplied');
    for (const [k, v] of entries) {
      if (!(k in SETTING_DEFAULTS)) throw new BadRequestException(`Unknown setting: ${k}`);
      if (!Number.isInteger(v) || (v as number) < 0) throw new BadRequestException(`${k} must be a non-negative integer`);
      if (MIN_ONE.includes(k as SettingKey) && (v as number) < 1) throw new BadRequestException(`${k} must be at least 1`);
    }
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.setting.upsert({ where: { key }, create: { key, value: value as number }, update: { value: value as number } }),
      ),
    );
    return this.all();
  }
}
