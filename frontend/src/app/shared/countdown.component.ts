import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';

/** Live "hold expires in 47h 12m 03s" timer. Emits `expired` once when it reaches zero. */
@Component({
  selector: 'app-countdown',
  standalone: true,
  template: `<span class="countdown" [class.urgent]="urgent()">{{ text() }}</span>`,
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input({ required: true }) until!: string;
  @Output() expired = new EventEmitter<void>();

  private now = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;
  private fired = false;

  private remaining = computed(() => new Date(this.until).getTime() - this.now());
  urgent = computed(() => this.remaining() < 3600_000);
  text = computed(() => {
    const ms = this.remaining();
    if (ms <= 0) return 'Expired';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${h}h ${p(m)}m ${p(sec)}s`;
  });

  ngOnInit() {
    this.timer = setInterval(() => {
      this.now.set(Date.now());
      if (!this.fired && this.remaining() <= 0) {
        this.fired = true;
        this.expired.emit();
      }
    }, 1000);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }
}
