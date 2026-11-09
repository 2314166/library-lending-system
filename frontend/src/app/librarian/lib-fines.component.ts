import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Fine } from '../core/models';
import { ToastService } from '../core/toast.service';
import { InrPipe, errMsg, toPaise } from '../core/util';

@Component({
  selector: 'app-lib-fines',
  standalone: true,
  imports: [DatePipe, FormsModule, InrPipe],
  template: `
    <div class="page-head"><div><h1>Fines</h1><p class="muted">Outstanding fines. Enter the amount received in rupees and record the payment.</p></div></div>
    @if (loading()) { <div class="state">Loading fines…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="card">
        @if (!fines().length) { <div class="empty">No outstanding fines.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Member</th><th>Book</th><th>Fined on</th><th class="num">Days</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Balance</th><th>Record payment (₹)</th></tr></thead>
            <tbody>
              @for (f of fines(); track f.id) {
                <tr>
                  <td>{{ f.member?.name }}<br><span class="muted small">{{ f.member?.email }}</span></td>
                  <td>{{ f.loan?.book?.title }}</td>
                  <td>{{ f.createdAt | date: 'dd MMM y' }}</td>
                  <td class="num">{{ f.daysLate }}</td>
                  <td class="num">{{ f.amount | inr }}</td>
                  <td class="num">{{ f.amountPaid | inr }}</td>
                  <td class="num"><strong>{{ f.amount - f.amountPaid | inr }}</strong></td>
                  <td>
                    <div class="row">
                      <input class="inline-input" type="number" min="0.01" step="0.01" placeholder="₹"
                             [ngModel]="amounts()[f.id]" (ngModelChange)="setAmount(f.id, $event)">
                      <button class="btn primary sm" [disabled]="busy()" (click)="pay(f)">Pay</button>
                      <button class="btn sm" [disabled]="busy()" (click)="payFull(f)">Pay full</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </div>
    }
  `,
})
export class LibFinesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  fines = signal<Fine[]>([]);
  amounts = signal<Record<number, number | null>>({});
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  ngOnInit() { this.load(); }

  load(spinner = true) {
    if (spinner) this.loading.set(true);
    this.error.set('');
    this.api.unpaidFines().subscribe({
      next: (f) => { this.fines.set(f); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  setAmount(id: number, v: number | null) { this.amounts.update((a) => ({ ...a, [id]: v })); }

  pay(f: Fine) {
    const rupees = Number(this.amounts()[f.id]);
    if (!rupees || rupees <= 0) { this.toast.err('Enter an amount greater than 0.'); return; }
    this.send(f, toPaise(rupees));
  }
  payFull(f: Fine) { this.send(f, f.amount - f.amountPaid); }

  private send(f: Fine, paise: number) {
    this.busy.set(true);
    this.api.payFine(f.id, paise).subscribe({
      next: () => {
        this.busy.set(false);
        this.amounts.update((a) => ({ ...a, [f.id]: null }));
        this.toast.ok('Payment recorded.');
        this.load(false);
      },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }
}
