import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Book, QueueEntry } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errMsg } from '../core/util';
import { CountdownComponent } from '../shared/countdown.component';

@Component({
  selector: 'app-lib-books',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, CountdownComponent],
  template: `
    <div class="page-head">
      <div><h1>Manage books</h1><p class="muted">Add, edit or remove titles and set the number of copies.</p></div>
      <div class="row">
        <input class="search" type="search" placeholder="Search books…" (input)="search$.next($any($event.target).value)">
        <button class="btn primary" (click)="startNew()">+ Add book</button>
      </div>
    </div>

    @if (formOpen()) {
      <div class="card">
        <h2>{{ editingId() ? 'Edit book' : 'Add a book' }}</h2>
        @if (formError()) { <div class="alert error">{{ formError() }}</div> }
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-grid">
            <label>Title *
              <input type="text" formControlName="title">
              @if (bad(form.controls.title)) { <span class="field-err">Title is required.</span> }
            </label>
            <label>Author *
              <input type="text" formControlName="author">
              @if (bad(form.controls.author)) { <span class="field-err">Author is required.</span> }
            </label>
            <label>Genre
              <input type="text" formControlName="genre">
            </label>
            <label>Total copies *
              <input type="number" min="0" step="1" formControlName="totalCopies">
              @if (bad(form.controls.totalCopies)) { <span class="field-err">Enter a whole number, 0 or more.</span> }
            </label>
          </div>
          <div class="row">
            <button class="btn primary" type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save' }}</button>
            <button class="btn" type="button" (click)="formOpen.set(false)">Cancel</button>
          </div>
        </form>
      </div>
    }

    @if (loading()) { <div class="state">Loading books…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="card">
        @if (!books().length) { <div class="empty">No books found.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Title</th><th>Genre</th><th class="num">Copies</th><th class="num">Available</th><th class="num">Queue</th><th></th></tr></thead>
            <tbody>
              @for (b of books(); track b.id) {
                <tr>
                  <td><strong>{{ b.title }}</strong><br><span class="muted small">{{ b.author }}</span></td>
                  <td>{{ b.genre ?? '—' }}</td>
                  <td class="num">{{ b.totalCopies }}</td>
                  <td class="num">{{ b.available }}</td>
                  <td class="num">{{ b.queueLength }}</td>
                  <td class="actions">
                    <button class="btn sm" (click)="showQueue(b)">Queue</button>
                    <button class="btn sm" (click)="edit(b)">Edit</button>
                    <button class="btn danger sm" [disabled]="busy()" (click)="remove(b)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </div>
    }

    @if (queueBook(); as qb) {
      <div class="card">
        <div class="row"><h2 class="grow">Reservation queue: {{ qb.title }}</h2><button class="btn sm" (click)="queueBook.set(null)">Close</button></div>
        @if (!queue().length) { <div class="empty">Nobody is waiting for this book.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>#</th><th>Member</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              @for (r of queue(); track r.id; let i = $index) {
                <tr>
                  <td>{{ i + 1 }}</td>
                  <td>{{ r.member.name }}<br><span class="muted small">{{ r.member.email }}</span></td>
                  <td>{{ r.createdAt | date: 'dd MMM y, HH:mm' }}</td>
                  <td>
                    @if (r.status === 'READY' && r.holdExpiresAt) { <span class="badge ok">Hold</span> <app-countdown [until]="r.holdExpiresAt" /> }
                    @else { <span class="badge">Waiting</span> }
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
export class LibBooksComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  books = signal<Book[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  formError = signal('');
  formOpen = signal(false);
  editingId = signal<number | null>(null);
  queueBook = signal<Book | null>(null);
  queue = signal<QueueEntry[]>([]);

  search$ = new Subject<string>();
  private sub?: Subscription;
  private q = '';

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.pattern(/\S/)]],
    author: ['', [Validators.required, Validators.pattern(/\S/)]],
    genre: [''],
    totalCopies: [1, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit() {
    this.load();
    this.sub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v) => { this.q = v; this.load(false); });
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  bad(c: { invalid: boolean; touched: boolean }) { return c.invalid && c.touched; }

  load(spinner = true) {
    if (spinner) this.loading.set(true);
    this.error.set('');
    this.api.books(this.q).subscribe({
      next: (b) => { this.books.set(b); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  startNew() {
    this.editingId.set(null);
    this.form.reset({ title: '', author: '', genre: '', totalCopies: 1 });
    this.formError.set('');
    this.formOpen.set(true);
  }
  edit(b: Book) {
    this.editingId.set(b.id);
    this.form.reset({ title: b.title, author: b.author, genre: b.genre ?? '', totalCopies: b.totalCopies });
    this.formError.set('');
    this.formOpen.set(true);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body = { title: v.title.trim(), author: v.author.trim(), genre: v.genre.trim() || undefined, totalCopies: Number(v.totalCopies) };
    const id = this.editingId();
    this.busy.set(true);
    this.formError.set('');
    (id ? this.api.updateBook(id, body) : this.api.createBook(body)).subscribe({
      next: () => { this.busy.set(false); this.formOpen.set(false); this.toast.ok(id ? 'Book updated.' : 'Book added.'); this.load(false); },
      error: (e) => { this.busy.set(false); this.formError.set(errMsg(e)); },
    });
  }

  remove(b: Book) {
    if (!confirm(`Delete "${b.title}"?`)) return;
    this.busy.set(true);
    this.api.deleteBook(b.id).subscribe({
      next: () => { this.busy.set(false); this.toast.ok('Book deleted.'); this.load(false); },
      error: (e) => { this.busy.set(false); this.toast.err(errMsg(e)); },
    });
  }

  showQueue(b: Book) {
    this.queueBook.set(b);
    this.queue.set([]);
    this.api.bookQueue(b.id).subscribe({
      next: (q) => this.queue.set(q),
      error: (e) => this.toast.err(errMsg(e)),
    });
  }
}
