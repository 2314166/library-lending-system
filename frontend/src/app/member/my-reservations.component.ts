import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { holdLapsed, holdLive } from '../core/hold';
import { Reservation } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errMsg } from '../core/util';
import { CountdownComponent } from '../shared/countdown.component';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CountdownComponent],
  template: `
    <div class="page-head"><div><h1>My reservations</h1>
      <p class="muted">Queues are first-come, first-served. When a copy is returned, the first person gets a temporary hold.</p></div>
      <button class="btn" (click)="load()">Refresh</button></div>
    @if (loading()) { <div class="state">Loading reservations…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="card">
        @if (!items().length) { <div class="empty">You have no active reservations.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Queue position</th><th>Hold countdown</th><th></th></tr></thead>
            <tbody>
              @for (r of items(); track r.id) {
                <tr>
                  <td><strong>{{ r.book.title }}</strong><br><span class="muted small">{{ r.book.author }}</span></td>
                  <td>@if (r.status === 'QUEUED') { <span class="badge">#{{ r.position }} in line</span> } @else { <span class="badge ok">Ready for you</span> }</td>
                  <td>
                    @if (live(r)) { <app-countdown [until]="r.holdExpiresAt!" (expired)="onExpired()" /> }
                    @else if (lapsed(r)) { <span class="badge grey">Hold expired, passing to next member</span> }
                    @else { <span class="muted">Waiting for a copy</span> }
                  </td>
                  <td class="actions">
                    @if (live(r)) { <button class="btn primary sm" [disabled]="busy()" (click)="checkout(r)">Check out</button> }
                    <button class="btn danger sm" [disabled]="busy()" (click)="cancel(r)">Cancel</button>
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
export class MyReservationsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  items = signal<Reservation[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  live = holdLive;
  lapsed = holdLapsed;

  ngOnInit() { this.load(); }

  load(spinner = true) {
    if (spinner) this.loading.set(true);
    this.error.set('');
    this.api.myReservations().subscribe({
      next: (r) => { this.items.set(r); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  /** The server hands the copy on at its next sweep (within a minute); reload shortly after. */
  onExpired() { setTimeout(() => this.load(false), 3000); }

  cancel(r: Reservation) {
    this.busy.set(true);
    this.api.cancelReservation(r.id).subscribe({
      next: () => { this.busy.set(false); this.toast.ok('Reservation cancelled.'); this.load(false); },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }

  checkout(r: Reservation) {
    this.busy.set(true);
    this.api.checkout(r.bookId).subscribe({
      next: () => { this.busy.set(false); this.toast.ok(`Checked out "${r.book.title}".`); this.load(false); },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }
}
