import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { holdLive } from '../core/hold';
import { Book, Loan, Reservation } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  template: `
    <div class="page-head">
      <div><h1>Book catalogue</h1><p class="muted">Search by title or author. Join the queue when no copy is free.</p></div>
      <input class="search" type="search" placeholder="Search books…" [value]="q" (input)="onSearch($any($event.target).value)">
    </div>

    @if (loading()) { <div class="state">Loading books…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="card">
        @if (!books().length) { <div class="empty">No books match your search.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Title</th><th>Genre</th><th>Availability</th><th>Queue</th><th></th></tr></thead>
            <tbody>
              @for (b of books(); track b.id) {
                <tr>
                  <td><strong>{{ b.title }}</strong><br><span class="muted small">{{ b.author }}</span></td>
                  <td>{{ b.genre ?? '—' }}</td>
                  <td>
                    @if (b.available > 0) { <span class="badge ok">{{ b.available }} of {{ b.totalCopies }} available</span> }
                    @else { <span class="badge warn">All {{ b.totalCopies }} out</span> }
                  </td>
                  <td>{{ b.queueLength }} waiting</td>
                  <td class="actions">
                    @switch (state(b)) {
                      @case ('onloan') { <span class="badge grey">On loan to you</span> }
                      @case ('held') { <button class="btn primary sm" [disabled]="busy()" (click)="checkout(b)">Collect held copy</button> }
                      @case ('queued') { <span class="badge">In queue #{{ myRes(b)?.position }}</span> }
                      @case ('available') { <button class="btn primary sm" [disabled]="busy()" (click)="checkout(b)">Check out</button> }
                      @default { <button class="btn sm" [disabled]="busy()" (click)="reserve(b)">Join queue</button> }
                    }
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
export class CatalogueComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  q = '';
  books = signal<Book[]>([]);
  loans = signal<Loan[]>([]);
  reservations = signal<Reservation[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  private search$ = new Subject<string>();
  private sub?: Subscription;

  ngOnInit() {
    this.load();
    this.sub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v) => { this.q = v; this.load(false); });
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }
  onSearch(v: string) { this.search$.next(v); }

  load(showSpinner = true) {
    if (showSpinner) this.loading.set(true);
    this.error.set('');
    forkJoin({ books: this.api.books(this.q), loans: this.api.myLoans(), res: this.api.myReservations() }).subscribe({
      next: (r) => { this.books.set(r.books); this.loans.set(r.loans); this.reservations.set(r.res); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  myRes(b: Book) { return this.reservations().find((r) => r.bookId === b.id); }

  state(b: Book): 'onloan' | 'held' | 'queued' | 'available' | 'full' {
    if (this.loans().some((l) => l.bookId === b.id)) return 'onloan';
    const r = this.myRes(b);
    if (r && holdLive(r)) return 'held';
    if (r) return 'queued';
    return b.available > 0 ? 'available' : 'full';
  }

  checkout(b: Book) {
    this.busy.set(true);
    this.api.checkout(b.id).subscribe({
      next: (l) => { this.busy.set(false); this.toast.ok(`Checked out "${b.title}". Due ${new Date(l.dueAt).toLocaleDateString()}.`); this.load(false); },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); this.load(false); },
    });
  }

  reserve(b: Book) {
    this.busy.set(true);
    this.api.reserve(b.id).subscribe({
      next: () => { this.busy.set(false); this.toast.ok(`You joined the queue for "${b.title}".`); this.load(false); },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); this.load(false); },
    });
  }
}
