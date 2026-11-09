import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, homeFor } from './core/auth.service';
import { errMsg } from './core/util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="auth-wrap">
      <div class="auth-card card">
        <div class="auth-head">
          <span class="brand-mark lg">L</span>
          <h1>Library Lending</h1>
          <p class="muted">Borrow, reserve and track your books.</p>
        </div>

        <div class="tabs" role="tablist">
          <button type="button" [class.active]="mode() === 'login'" (click)="setMode('login')">Sign in</button>
          <button type="button" [class.active]="mode() === 'register'" (click)="setMode('register')">Register</button>
        </div>

        @if (error()) { <div class="alert error">{{ error() }}</div> }

        @if (mode() === 'login') {
          <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" novalidate>
            <label>Email
              <input type="email" formControlName="email" autocomplete="username" placeholder="you@library.test">
              @if (show(loginForm.controls.email)) { <span class="field-err">Enter a valid email address.</span> }
            </label>
            <label>Password
              <input type="password" formControlName="password" autocomplete="current-password">
              @if (show(loginForm.controls.password)) { <span class="field-err">Password is required.</span> }
            </label>
            <button class="btn primary block" type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
          </form>
          <div class="demo">
            <span class="muted">Demo accounts (password <code>Password123!</code>):</span>
            <div class="row">
              <button type="button" class="btn ghost sm" (click)="fill('librarian@library.test')">Librarian</button>
              <button type="button" class="btn ghost sm" (click)="fill('member1@library.test')">Member 1</button>
              <button type="button" class="btn ghost sm" (click)="fill('member10@library.test')">Member 10 (blocked)</button>
            </div>
          </div>
        } @else {
          <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" novalidate>
            <label>Full name
              <input type="text" formControlName="name" autocomplete="name">
              @if (show(registerForm.controls.name)) { <span class="field-err">Name is required.</span> }
            </label>
            <label>Email
              <input type="email" formControlName="email" autocomplete="email">
              @if (show(registerForm.controls.email)) { <span class="field-err">Enter a valid email address.</span> }
            </label>
            <label>Password
              <input type="password" formControlName="password" autocomplete="new-password">
              @if (show(registerForm.controls.password)) { <span class="field-err">At least 8 characters.</span> }
            </label>
            <button class="btn primary block" type="submit" [disabled]="busy()">{{ busy() ? 'Creating…' : 'Create member account' }}</button>
            <p class="muted small">New accounts are always Members. Librarian accounts are created by the system.</p>
          </form>
        }
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  mode = signal<'login' | 'register'>('login');
  busy = signal(false);
  error = signal('');

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  registerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  show(c: { invalid: boolean; touched: boolean }) { return c.invalid && c.touched; }
  setMode(m: 'login' | 'register') { this.mode.set(m); this.error.set(''); }
  fill(email: string) { this.loginForm.setValue({ email, password: 'Password123!' }); }

  submitLogin() {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    const { email, password } = this.loginForm.getRawValue();
    this.run(this.auth.login(email.trim(), password));
  }
  submitRegister() {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    const { name, email, password } = this.registerForm.getRawValue();
    this.run(this.auth.register(name.trim(), email.trim(), password));
  }

  private run(obs: ReturnType<AuthService['login']>) {
    this.busy.set(true);
    this.error.set('');
    obs.subscribe({
      next: () => { this.busy.set(false); this.router.navigate([homeFor(this.auth.role())]); },
      error: (e) => { this.busy.set(false); this.error.set(errMsg(e)); },
    });
  }
}
