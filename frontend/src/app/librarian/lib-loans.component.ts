import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Loan } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-lib-loans',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-head"><div><h1>Loans &amp; returns</h1><p class="muted">Process a return to calculate any fine and release the copy to the queue.</p></div></div>
    <div class="tabs">
      <button type="button" [class.active]="filter() === 'active'" (click)="setFilter('active')">All active</button>
      <button type="button" [class.active]="filter() === 'overdue'" (click)="setFilter('overdue')">Overdue only</button>
    </div>
    @if (loading()) { <div class="state">Loading loans…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="card">
        @if (!loans().length) { <div class="empty">No loans to show.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Member</th><th>Borrowed</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (l of loans(); track l.id) {
                <tr [class.overdue]="l.overdue">
                  <td><strong>{{ l.book.title }}</strong></td>
                  <td>{{ l.member?.name }}<br><span class="muted small">{{ l.member?.email }}</span></td>
                  <td>{{ l.borrowedAt | date: 'dd MMM y' }}</td>
                  <td>{{ l.dueAt | date: 'dd MMM y' }}</td>
                  <td>@if (l.overdue) { <span class="badge danger">{{ l.daysOverdue }} day(s) late</span> } @else { <span class="badge ok">On time</span> }</td>
                  <td class="actions"><button class="btn primary sm" [disabled]="busy()" (click)="returnLoan(l)">Process return</button></td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </div>
    }
  `,
})
export class LibLoansComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loans = signal<Loan[]>([]);
  filter = signal<'active' | 'overdue'>('active');
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  ngOnInit() { this.load(); }
  setFilter(f: 'active' | 'overdue') { this.filter.set(f); this.load(); }

  load(spinner = true) {
    if (spinner) this.loading.set(true);
    this.error.set('');
    this.api.loans(this.filter()).subscribe({
      next: (l) => { this.loans.set(l); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  returnLoan(l: Loan) {
    this.busy.set(true);
    this.api.returnLoan(l.id).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.toast.ok(r.fine ? `Returned "${l.book.title}". Fine created: ${r.daysLate} day(s) late.` : `Returned "${l.book.title}" on time.`);
        this.load(false);
      },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }
}
