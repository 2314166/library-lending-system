import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Fine, Loan, MemberRow } from '../core/models';
import { ToastService } from '../core/toast.service';
import { InrPipe, errMsg } from '../core/util';

@Component({
  selector: 'app-lib-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, InrPipe],
  template: `
    <div class="page-head"><div><h1>Librarian dashboard</h1><p class="muted">Overdue loans, returns and fines at a glance.</p></div></div>
    @if (loading()) { <div class="state">Loading dashboard…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="stats">
        <div class="stat"><div class="label">Active loans</div><div class="value">{{ active().length }}</div></div>
        <div class="stat" [class.danger]="overdue().length > 0"><div class="label">Overdue loans</div><div class="value">{{ overdue().length }}</div></div>
        <div class="stat" [class.warn]="unpaid() > 0"><div class="label">Unpaid fines</div><div class="value">{{ unpaid() | inr }}</div></div>
        <div class="stat" [class.warn]="blocked() > 0"><div class="label">Blocked members</div><div class="value">{{ blocked() }}</div></div>
      </div>

      <div class="card">
        <div class="row"><h2 class="grow">Overdue loans</h2><a routerLink="/librarian/loans">All loans &amp; returns</a></div>
        @if (!overdue().length) { <div class="empty">Nothing is overdue.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Member</th><th>Due</th><th>Days late</th><th></th></tr></thead>
            <tbody>
              @for (l of overdue(); track l.id) {
                <tr class="overdue">
                  <td><strong>{{ l.book.title }}</strong></td>
                  <td>{{ l.member?.name }}<br><span class="muted small">{{ l.member?.email }}</span></td>
                  <td>{{ l.dueAt | date: 'dd MMM y' }}</td>
                  <td>{{ l.daysOverdue }}</td>
                  <td class="actions"><button class="btn primary sm" [disabled]="busy()" (click)="returnLoan(l)">Process return</button></td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </div>

      <div class="row">
        <a class="btn" routerLink="/librarian/books">Manage books</a>
        <a class="btn" routerLink="/librarian/fines">Record fine payment</a>
        <a class="btn" routerLink="/librarian/members">View members</a>
        <a class="btn" routerLink="/librarian/settings">Settings</a>
      </div>
    }
  `,
})
export class LibDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  active = signal<Loan[]>([]);
  fines = signal<Fine[]>([]);
  members = signal<MemberRow[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  overdue = computed(() => this.active().filter((l) => l.overdue));
  unpaid = computed(() => this.fines().reduce((a, f) => a + (f.amount - f.amountPaid), 0));
  blocked = computed(() => this.members().filter((m) => m.blocked).length);

  ngOnInit() { this.load(); }

  load(spinner = true) {
    if (spinner) this.loading.set(true);
    this.error.set('');
    forkJoin({ loans: this.api.loans('active'), fines: this.api.unpaidFines(), members: this.api.members() }).subscribe({
      next: (r) => { this.active.set(r.loans); this.fines.set(r.fines); this.members.set(r.members); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  returnLoan(l: Loan) {
    this.busy.set(true);
    this.api.returnLoan(l.id).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.toast.ok(r.fine ? `Returned. Fine created for ${r.daysLate} day(s).` : 'Returned on time.');
        this.load(false);
      },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }
}
