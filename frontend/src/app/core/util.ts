import { HttpErrorResponse } from '@angular/common/http';
import { Pipe, PipeTransform } from '@angular/core';

/** Turns a backend error (Nest returns { message: string | string[] }) into readable text. */
export function errMsg(e: unknown): string {
  const err = e as HttpErrorResponse;
  const m = err?.error?.message;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string') return m;
  if (err?.status === 0) return 'Cannot reach the server. Is the backend running on port 3100?';
  return err?.message ?? 'Something went wrong';
}

/** paise -> "Rs 1,234.50" */
@Pipe({ name: 'inr', standalone: true })
export class InrPipe implements PipeTransform {
  transform(paise: number | null | undefined): string {
    const v = (paise ?? 0) / 100;
    return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => paise / 100;
