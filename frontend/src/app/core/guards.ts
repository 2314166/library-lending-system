import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, homeFor } from './auth.service';
import { Role } from './models';

/** Logged-in users only. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

/** Only the given role. Others are sent to their own home page. (Backend enforces roles too.) */
export const roleGuard = (role: Role): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  return auth.role() === role ? true : router.createUrlTree([homeFor(auth.role())]);
};

/** Login page: skip it if already signed in. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree([homeFor(auth.role())]) : true;
};

/** "/" -> role home page. */
export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return router.createUrlTree([auth.isLoggedIn() ? homeFor(auth.role()) : '/login']);
};
