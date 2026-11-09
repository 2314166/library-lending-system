import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';

interface NavItem { path: string; label: string }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isLoggedIn()) {
      <header class="topbar">
        <a class="brand" [routerLink]="auth.role() === 'LIBRARIAN' ? '/librarian/dashboard' : '/member/dashboard'">
          <span class="brand-mark">L</span> Library Lending
        </a>
        <button class="menu-btn" type="button" (click)="open.set(!open())" aria-label="Toggle menu">☰</button>
        <nav class="nav" [class.open]="open()">
          @for (item of nav(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" (click)="open.set(false)">{{ item.label }}</a>
          }
        </nav>
        <div class="who" [class.open]="open()">
          <span class="who-name">{{ auth.user()?.name }}
            <small>{{ auth.role() === 'LIBRARIAN' ? 'Librarian' : 'Member' }}</small></span>
          <button class="btn ghost sm" type="button" (click)="auth.logout()">Sign out</button>
        </div>
      </header>
    }
    <main class="page"><router-outlet /></main>

    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.err]="t.kind === 'err'" (click)="toast.dismiss(t.id)">{{ t.text }}</div>
      }
    </div>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  toast = inject(ToastService);
  open = signal(false);

  private memberNav: NavItem[] = [
    { path: '/member/dashboard', label: 'Dashboard' },
    { path: '/member/catalogue', label: 'Catalogue' },
    { path: '/member/loans', label: 'My Loans' },
    { path: '/member/reservations', label: 'Reservations' },
    { path: '/member/fines', label: 'Fines' },
  ];
  private libNav: NavItem[] = [
    { path: '/librarian/dashboard', label: 'Dashboard' },
    { path: '/librarian/books', label: 'Books' },
    { path: '/librarian/loans', label: 'Loans & Returns' },
    { path: '/librarian/fines', label: 'Fines' },
    { path: '/librarian/members', label: 'Members' },
    { path: '/librarian/settings', label: 'Settings' },
  ];
  nav = () => (this.auth.role() === 'LIBRARIAN' ? this.libNav : this.memberNav);
}
