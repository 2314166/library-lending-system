import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse, AuthUser, Role } from './models';

const KEY = 'library.auth';

export function homeFor(role: Role | null): string {
  return role === 'LIBRARIAN' ? '/librarian/dashboard' : '/member/dashboard';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private state = signal<AuthResponse | null>(this.read());
  readonly user = computed<AuthUser | null>(() => this.state()?.user ?? null);
  readonly token = computed(() => this.state()?.accessToken ?? null);
  readonly isLoggedIn = computed(() => !!this.state());
  readonly role = computed<Role | null>(() => this.state()?.user.role ?? null);

  login(email: string, password: string) {
    return this.api.login({ email, password }).pipe(tap((r) => this.store(r)));
  }
  register(name: string, email: string, password: string) {
    return this.api.register({ name, email, password }).pipe(tap((r) => this.store(r)));
  }
  logout() {
    this.state.set(null);
    try { localStorage.removeItem(KEY); } catch { /* storage may be unavailable */ }
    this.router.navigate(['/login']);
  }

  private store(r: AuthResponse) {
    this.state.set(r);
    try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ }
  }
  private read(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AuthResponse) : null;
    } catch { return null; }
  }
}
