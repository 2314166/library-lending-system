import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Fine } from '../core/models';
import { InrPipe, errMsg } from '../core/util';

@Component({
  selector: 'app-my-fines',
  standalone: true,
  imports: [DatePipe, InrPipe],
  template: `
    <div class="page-head"><div><h1>My fines</h1><p class="muted">Fines are paid at the library desk; the librarian records the payment.</p></div></div>
    @if (loading()) { <div class="state">Loading fines…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="stats">
        <div class="stat" [class.warn]="outstanding() > 0"><div class="label">Outstanding</div><div class="value">{{ outstanding() | inr }}</div></div>
        <div class="stat"><div class="label">Total fined</div><div class="value">{{ total() | inr }}</div></div>
      </div>
      <div class="card">
        @if (!fines().length) { <div class="empty">You have no fines. 🎉</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Fined on</th><th class="num">Days late</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Balance</th></tr></thead>
            <tbody>
              @for (f of fines(); track f.id) {
                <tr>
                  <td>{{ f.loan?.book?.title }}</td>
                  <td>{{ f.createdAt | date: 'dd MMM y' }}</td>
                  <td class="num">{{ f.daysLate }}</td>
                  <td class="num">{{ f.amount | inr }}</td>
                  <td class="num">{{ f.amountPaid | inr }}</td>
                  <td class="num">
                    @if (f.amount - f.amountPaid > 0) { <span class="badge warn">{{ f.amount - f.amountPaid | inr }}</span> }
                    @else { <span class="badge ok">Paid</span> }
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
export class MyFinesComponent implements OnInit {
  private api = inject(ApiService);
  fines = signal<Fine[]>([]);
  loading = signal(true);
  error = signal('');
  total = computed(() => this.fines().reduce((a, f) => a + f.amount, 0));
  outstanding = computed(() => this.fines().reduce((a, f) => a + (f.amount - f.amountPaid), 0));

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.myFines().subscribe({
      next: (f) => { this.fines.set(f); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
