import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./login.component').then((m) => m.LoginComponent) },
  {
    path: 'member',
    canActivate: [authGuard, roleGuard('MEMBER')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./member/member-dashboard.component').then((m) => m.MemberDashboardComponent) },
      { path: 'catalogue', loadComponent: () => import('./member/catalogue.component').then((m) => m.CatalogueComponent) },
      { path: 'loans', loadComponent: () => import('./member/my-loans.component').then((m) => m.MyLoansComponent) },
      { path: 'reservations', loadComponent: () => import('./member/my-reservations.component').then((m) => m.MyReservationsComponent) },
      { path: 'fines', loadComponent: () => import('./member/my-fines.component').then((m) => m.MyFinesComponent) },
    ],
  },
  {
    path: 'librarian',
    canActivate: [authGuard, roleGuard('LIBRARIAN')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./librarian/lib-dashboard.component').then((m) => m.LibDashboardComponent) },
      { path: 'books', loadComponent: () => import('./librarian/lib-books.component').then((m) => m.LibBooksComponent) },
      { path: 'loans', loadComponent: () => import('./librarian/lib-loans.component').then((m) => m.LibLoansComponent) },
      { path: 'fines', loadComponent: () => import('./librarian/lib-fines.component').then((m) => m.LibFinesComponent) },
      { path: 'members', loadComponent: () => import('./librarian/lib-members.component').then((m) => m.LibMembersComponent) },
      { path: 'members/:id', loadComponent: () => import('./librarian/lib-member-detail.component').then((m) => m.LibMemberDetailComponent) },
      { path: 'settings', loadComponent: () => import('./librarian/lib-settings.component').then((m) => m.LibSettingsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
