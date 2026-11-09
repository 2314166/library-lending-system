// Money is in paise (100 paise = 1 rupee).
export const SETTING_DEFAULTS = {
  LOAN_PERIOD_DAYS: 14,
  FINE_PER_DAY: 500,
  FINE_CAP: 20000,
  MAX_ACTIVE_LOANS: 5,
  BORROW_BLOCK_THRESHOLD: 10000,
  HOLD_WINDOW_HOURS: 48,
};
export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, number>;
