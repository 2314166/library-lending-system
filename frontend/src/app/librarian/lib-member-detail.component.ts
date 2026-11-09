import { DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { holdLive } from '../core/hold';
import { MemberSummary } from '../core/models';
import { InrPipe, errMsg } from '../core/util';
import { CountdownComponent } from '../shared/countdown.component';

@Component({
  selector: 'app-lib-member-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, InrPipe, CountdownComponent],
  template: `
    <div class="page-head">
      <div><a routerLink="/librarian/members">← Members</a>
        <h1>{{ s()?.user?.name ?? 'Member' }}</h1><p class="muted">{{ s()?.user?.email }}</p></div>
    </div>
    @if (loading()) { <div class="state">Loading member…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else if (s()) {
      @let d = s()!;
      @if (d.blocked) { <div class="alert error">This member is blocked from borrowing (unpaid fines {{ d.unpaidFines | inr }} exceed {{ d.limits.blockThreshold | inr }}).</div> }
      <div class="stats">
        <div class="stat"><div class="label">Active loans</div><div class="value">{{ d.loans.length }} <small class="muted">/ {{ d.limits.maxActiveLoans }}</small></div></div>
        <div class="stat" [class.warn]="d.unpaidFines > 0"><div class="label">Unpaid fines</div><div class="value">{{ d.unpaidFines | inr }}</div></div>
        <div class="stat"><div class="label">Reservations</div><div class="value">{{ d.reservations.length }}</div></div>
      </div>

      <div class="card"><h2>Active loans</h2>
        @if (!d.loans.length) { <div class="empty">No active loans.</div> } @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Borrowed</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              @for (l of d.loans; track l.id) {
                <tr [class.overdue]="l.overdue">
                  <td>{{ l.book.title }}</td><td>{{ l.borrowedAt | date: 'dd MMM y' }}</td><td>{{ l.dueAt | date: 'dd MMM y' }}</td>
                  <td>@if (l.overdue) { <span class="badge danger">{{ l.daysOverdue }} day(s) late</span> } @else { <span class="badge ok">On time</span> }</td>
                </tr>
              }
            </tbody></table></div>
        }
      </div>

      <div class="card"><h2>Reservations</h2>
        @if (!d.reservations.length) { <div class="empty">No reservations.</div> } @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Status</th></tr></thead>
            <tbody>
              @for (r of d.reservations; track r.id) {
                <tr><td>{{ r.book.title }}</td>
                  <td>@if (r.status === 'QUEUED') { #{{ r.position }} in queue }
                      @else if (live(r)) { Hold: <app-countdown [until]="r.holdExpiresAt!" /> }
                      @else { <span class="badge grey">Hold expired</span> }</td></tr>
              }
            </tbody></table></div>
        }
      </div>

      <div class="card"><h2>Fines</h2>
        @if (!d.fines.length) { <div class="empty">No fines.</div> } @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Fined on</th><th class="num">Days</th><th class="num">Amount</th><th class="num">Paid</th></tr></thead>
            <tbody>
              @for (f of d.fines; track f.id) {
                <tr><td>{{ f.loan?.book?.title }}</td><td>{{ f.createdAt | date: 'dd MMM y' }}</td>
                  <td class="num">{{ f.daysLate }}</td><td class="num">{{ f.amount | inr }}</td><td class="num">{{ f.amountPaid | inr }}</td></tr>
              }
            </tbody></table></div>
        }
      </div>
    }
  `,
})
export class LibMemberDetailComponent implements OnInit {
  /** Bound from the :id route parameter (withComponentInputBinding). */
  @Input() id!: string;
  private api = inject(ApiService);
  s = signal<MemberSummary | null>(null);
  loading = signal(true);
  error = signal('');
  live = holdLive;

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.memberSummary(Number(this.id)).subscribe({
      next: (d) => { this.s.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
