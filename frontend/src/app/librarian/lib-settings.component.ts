import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Settings } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errMsg, toPaise, toRupees } from '../core/util';

@Component({
  selector: 'app-lib-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-head"><div><h1>Library settings</h1><p class="muted">Changes apply immediately to new checkouts, returns and holds. No restart needed.</p></div></div>
    @if (loading()) { <div class="state">Loading settings…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="form-grid">
          <label>Loan period (days)
            <input type="number" step="1" formControlName="LOAN_PERIOD_DAYS">
            @if (bad('LOAN_PERIOD_DAYS')) { <span class="field-err">Whole number, at least 1.</span> }
            <span class="hint">Due date = checkout date + this many days.</span>
          </label>
          <label>Fine per day (₹)
            <input type="number" step="0.01" formControlName="FINE_PER_DAY">
            @if (bad('FINE_PER_DAY')) { <span class="field-err">0 or more.</span> }
            <span class="hint">A part-day late counts as a full day.</span>
          </label>
          <label>Fine cap (₹)
            <input type="number" step="0.01" formControlName="FINE_CAP">
            @if (bad('FINE_CAP')) { <span class="field-err">0 or more.</span> }
            <span class="hint">Maximum fine per loan.</span>
          </label>
          <label>Max active loans
            <input type="number" step="1" formControlName="MAX_ACTIVE_LOANS">
            @if (bad('MAX_ACTIVE_LOANS')) { <span class="field-err">Whole number, at least 1.</span> }
          </label>
          <label>Borrow-block threshold (₹)
            <input type="number" step="0.01" formControlName="BORROW_BLOCK_THRESHOLD">
            @if (bad('BORROW_BLOCK_THRESHOLD')) { <span class="field-err">0 or more.</span> }
            <span class="hint">Members with unpaid fines above this cannot borrow.</span>
          </label>
          <label>Hold window (hours)
            <input type="number" step="1" formControlName="HOLD_WINDOW_HOURS">
            @if (bad('HOLD_WINDOW_HOURS')) { <span class="field-err">Whole number, at least 1.</span> }
            <span class="hint">How long a returned copy is held for the next member.</span>
          </label>
        </div>
        <button class="btn primary" type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save settings' }}</button>
      </form>
    }
  `,
})
export class LibSettingsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  private int = (min: number) => [0, [Validators.required, Validators.min(min), Validators.pattern(/^\d+$/)]] as const;
  form = this.fb.nonNullable.group({
    LOAN_PERIOD_DAYS: [14, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    FINE_PER_DAY: [5, [Validators.required, Validators.min(0)]],
    FINE_CAP: [200, [Validators.required, Validators.min(0)]],
    MAX_ACTIVE_LOANS: [5, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    BORROW_BLOCK_THRESHOLD: [100, [Validators.required, Validators.min(0)]],
    HOLD_WINDOW_HOURS: [48, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit() { this.load(); }
  bad(name: keyof Settings) { const c = this.form.controls[name]; return c.invalid && c.touched; }

  load() {
    this.loading.set(true); this.error.set('');
    this.api.getSettings().subscribe({
      next: (s) => { this.fill(s); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  private fill(s: Settings) {
    this.form.setValue({
      LOAN_PERIOD_DAYS: s.LOAN_PERIOD_DAYS,
      FINE_PER_DAY: toRupees(s.FINE_PER_DAY),
      FINE_CAP: toRupees(s.FINE_CAP),
      MAX_ACTIVE_LOANS: s.MAX_ACTIVE_LOANS,
      BORROW_BLOCK_THRESHOLD: toRupees(s.BORROW_BLOCK_THRESHOLD),
      HOLD_WINDOW_HOURS: s.HOLD_WINDOW_HOURS,
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body: Settings = {
      LOAN_PERIOD_DAYS: Number(v.LOAN_PERIOD_DAYS),
      FINE_PER_DAY: toPaise(Number(v.FINE_PER_DAY)),
      FINE_CAP: toPaise(Number(v.FINE_CAP)),
      MAX_ACTIVE_LOANS: Number(v.MAX_ACTIVE_LOANS),
      BORROW_BLOCK_THRESHOLD: toPaise(Number(v.BORROW_BLOCK_THRESHOLD)),
      HOLD_WINDOW_HOURS: Number(v.HOLD_WINDOW_HOURS),
    };
    this.busy.set(true);
    this.api.saveSettings(body).subscribe({
      next: (s) => { this.busy.set(false); this.fill(s); this.toast.ok('Settings saved. They apply immediately.'); },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }
}
