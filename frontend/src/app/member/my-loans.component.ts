import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Loan } from '../core/models';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-my-loans',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-head"><div><h1>My loans</h1><p class="muted">Return books to the librarian desk before the due date to avoid fines.</p></div></div>
    @if (loading()) { <div class="state">Loading loans…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="card">
        @if (!loans().length) { <div class="empty">You have no active loans.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Borrowed</th><th>Due date</th><th>Status</th></tr></thead>
            <tbody>
              @for (l of loans(); track l.id) {
                <tr [class.overdue]="l.overdue">
                  <td><strong>{{ l.book.title }}</strong><br><span class="muted small">{{ l.book.author }}</span></td>
                  <td>{{ l.borrowedAt | date: 'dd MMM y' }}</td>
                  <td>{{ l.dueAt | date: 'dd MMM y' }}</td>
                  <td>@if (l.overdue) { <span class="badge danger">Overdue by {{ l.daysOverdue }} day(s)</span> } @else { <span class="badge ok">On time</span> }</td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </div>
    }
  `,
})
export class MyLoansComponent implements OnInit {
  private api = inject(ApiService);
  loans = signal<Loan[]>([]);
  loading = signal(true);
  error = signal('');
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.myLoans().subscribe({
      next: (l) => { this.loans.set(l); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
