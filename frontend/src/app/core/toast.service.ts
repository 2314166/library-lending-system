import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; kind: 'ok' | 'err'; text: string }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private n = 0;

  ok(text: string) { this.push('ok', text); }
  err(text: string) { this.push('err', text); }

  private push(kind: Toast['kind'], text: string) {
    const id = ++this.n;
    this.toasts.update((t) => [...t, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), 5000);
  }
  dismiss(id: number) { this.toasts.update((t) => t.filter((x) => x.id !== id)); }
}
