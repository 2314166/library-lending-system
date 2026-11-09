import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { holdLapsed, holdLive } from '../core/hold';
import { MemberSummary } from '../core/models';
import { ToastService } from '../core/toast.service';
import { InrPipe, errMsg } from '../core/util';
import { CountdownComponent } from '../shared/countdown.component';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, InrPipe, CountdownComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Welcome, {{ s()?.user?.name ?? 'reader' }}</h1>
        <p class="muted">Your loans, reservations and fines at a glance.</p>
      </div>
      <a class="btn primary" routerLink="/member/catalogue">Browse catalogue</a>
    </div>

    @if (loading()) { <div class="state">Loading your dashboard…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else if (s()) {
      @let d = s()!;
      @if (d.blocked) {
        <div class="alert error">
          Borrowing is blocked: your unpaid fines ({{ d.unpaidFines | inr }}) exceed the limit of
          {{ d.limits.blockThreshold | inr }}. Please pay at the library desk.
        </div>
      }

      @for (r of d.reservations; track r.id) {
        @if (live(r)) {
          <div class="hold-banner">
            <div>
              <strong>"{{ r.book.title }}" is being held for you.</strong><br>
              <span class="muted small">Collect it before the hold expires:</span>
              <app-countdown [until]="r.holdExpiresAt!" (expired)="load()" />
            </div>
            <button class="btn primary" [disabled]="busy()" (click)="checkout(r.bookId)">Check out now</button>
          </div>
        }
      }

      <div class="stats">
        <div class="stat"><div class="label">Active loans</div><div class="value">{{ d.loans.length }} <small class="muted">/ {{ d.limits.maxActiveLoans }}</small></div></div>
        <div class="stat" [class.danger]="overdueCount() > 0"><div class="label">Overdue</div><div class="value">{{ overdueCount() }}</div></div>
        <div class="stat" [class.warn]="d.unpaidFines > 0"><div class="label">Unpaid fines</div><div class="value">{{ d.unpaidFines | inr }}</div></div>
        <div class="stat"><div class="label">Reservations</div><div class="value">{{ d.reservations.length }}</div></div>
      </div>

      <div class="card">
        <div class="row"><h2 class="grow">Active loans</h2><a routerLink="/member/loans">See all</a></div>
        @if (!d.loans.length) { <div class="empty">No active loans. Visit the catalogue to borrow a book.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Due date</th><th>Status</th></tr></thead>
            <tbody>
              @for (l of d.loans; track l.id) {
                <tr [class.overdue]="l.overdue">
                  <td><strong>{{ l.book.title }}</strong><br><span class="muted small">{{ l.book.author }}</span></td>
                  <td>{{ l.dueAt | date: 'dd MMM y' }}</td>
                  <td>@if (l.overdue) { <span class="badge danger">Overdue {{ l.daysOverdue }} day(s)</span> } @else { <span class="badge ok">On time</span> }</td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </div>

      <div class="card">
        <div class="row"><h2 class="grow">Reservations</h2><a routerLink="/member/reservations">Manage</a></div>
        @if (!d.reservations.length) { <div class="empty">You are not in any queue.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Queue position</th><th>Hold</th></tr></thead>
            <tbody>
              @for (r of d.reservations; track r.id) {
                <tr>
                  <td><strong>{{ r.book.title }}</strong></td>
                  <td>@if (r.status === 'QUEUED') { #{{ r.position }} in line } @else { <span class="badge ok">Ready for you</span> }</td>
                  <td>
                    @if (live(r)) { <app-countdown [until]="r.holdExpiresAt!" (expired)="load()" /> }
                    @else if (lapsed(r)) { <span class="badge grey">Hold expired</span> }
                    @else { <span class="muted">Waiting</span> }
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
export class MemberDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  s = signal<MemberSummary | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  live = holdLive;
  lapsed = holdLapsed;

  ngOnInit() { this.load(); }

  overdueCount() { return this.s()?.loans.filter((l) => l.overdue).length ?? 0; }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.mySummary().subscribe({
      next: (d) => { this.s.set(d); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  checkout(bookId: number) {
    this.busy.set(true);
    this.api.checkout(bookId).subscribe({
      next: (l) => { this.busy.set(false); this.toast.ok(`Checked out "${l.book.title}".`); this.load(); },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }
}
