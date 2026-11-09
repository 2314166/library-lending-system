import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MemberRow } from '../core/models';
import { InrPipe, errMsg } from '../core/util';

@Component({
  selector: 'app-lib-members',
  standalone: true,
  imports: [RouterLink, InrPipe],
  template: `
    <div class="page-head"><div><h1>Members</h1><p class="muted">Borrowing status of every member.</p></div></div>
    @if (loading()) { <div class="state">Loading members…</div> }
    @else if (error()) { <div class="alert error">{{ error() }} <button class="btn sm" (click)="load()">Retry</button></div> }
    @else {
      <div class="card">
        @if (!members().length) { <div class="empty">No members yet.</div> }
        @else {
          <div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Email</th><th class="num">Active loans</th><th class="num">Unpaid fines</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (m of members(); track m.id) {
                <tr>
                  <td><strong>{{ m.name }}</strong></td>
                  <td>{{ m.email }}</td>
                  <td class="num">{{ m.activeLoans }}</td>
                  <td class="num">{{ m.unpaidFines | inr }}</td>
                  <td>@if (m.blocked) { <span class="badge danger">Blocked</span> } @else { <span class="badge ok">Can borrow</span> }</td>
                  <td class="actions"><a class="btn sm" [routerLink]="['/librarian/members', m.id]">Details</a></td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </div>
    }
  `,
})
export class LibMembersComponent implements OnInit {
  private api = inject(ApiService);
  members = signal<MemberRow[]>([]);
  loading = signal(true);
  error = signal('');
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.members().subscribe({
      next: (m) => { this.members.set(m); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
