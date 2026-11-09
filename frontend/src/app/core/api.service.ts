import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AuthResponse, Book, BookBase, BookInput, Fine, Loan, MemberRow, MemberSummary,
  QueueEntry, Reservation, ReturnResult, Settings,
} from './models';

/** All backend calls live here. The dev-server proxy maps /api/* to http://localhost:3100/* */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // auth
  login(body: { email: string; password: string }) { return this.http.post<AuthResponse>(`${this.base}/auth/login`, body); }
  register(body: { name: string; email: string; password: string }) { return this.http.post<AuthResponse>(`${this.base}/auth/register`, body); }

  // books
  books(q?: string) {
    let params = new HttpParams();
    if (q && q.trim()) params = params.set('q', q.trim());
    return this.http.get<Book[]>(`${this.base}/books`, { params });
  }
  createBook(b: BookInput) { return this.http.post<BookBase>(`${this.base}/books`, b); }
  updateBook(id: number, b: Partial<BookInput>) { return this.http.patch<BookBase>(`${this.base}/books/${id}`, b); }
  deleteBook(id: number) { return this.http.delete<{ deleted: boolean }>(`${this.base}/books/${id}`); }
  bookQueue(id: number) { return this.http.get<QueueEntry[]>(`${this.base}/books/${id}/queue`); }

  // loans
  checkout(bookId: number) { return this.http.post<Loan>(`${this.base}/loans/checkout`, { bookId }); }
  myLoans() { return this.http.get<Loan[]>(`${this.base}/loans/mine`); }
  loans(status?: 'active' | 'overdue') {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Loan[]>(`${this.base}/loans`, { params });
  }
  returnLoan(id: number) { return this.http.post<ReturnResult>(`${this.base}/loans/${id}/return`, {}); }

  // reservations
  reserve(bookId: number) { return this.http.post<Reservation>(`${this.base}/reservations`, { bookId }); }
  cancelReservation(id: number) { return this.http.delete<Reservation>(`${this.base}/reservations/${id}`); }
  myReservations() { return this.http.get<Reservation[]>(`${this.base}/reservations/mine`); }

  // fines
  myFines() { return this.http.get<Fine[]>(`${this.base}/fines/mine`); }
  unpaidFines() { return this.http.get<Fine[]>(`${this.base}/fines`); }
  payFine(id: number, amountPaise: number) { return this.http.post<Fine>(`${this.base}/fines/${id}/payments`, { amount: amountPaise }); }

  // users
  mySummary() { return this.http.get<MemberSummary>(`${this.base}/me/summary`); }
  members() { return this.http.get<MemberRow[]>(`${this.base}/users`); }
  memberSummary(id: number) { return this.http.get<MemberSummary>(`${this.base}/users/${id}/summary`); }

  // settings
  getSettings() { return this.http.get<Settings>(`${this.base}/settings`); }
  saveSettings(s: Settings) { return this.http.put<Settings>(`${this.base}/settings`, s); }
}
