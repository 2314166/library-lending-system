import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { applyConstraints } from '../src/db/apply-constraints';
import { DAY_MS, HOUR_MS } from '../src/common/constants';
import { calculateFine } from '../src/fines/fine-calculator';
import { SETTING_DEFAULTS } from '../src/settings/settings.defaults';

const prisma = new PrismaClient();
const BOOKS: [string, string, string][] = [
  ['Clean Code', 'Robert C. Martin', 'Tech'], ['The Pragmatic Programmer', 'Andrew Hunt', 'Tech'],
  ['Designing Data-Intensive Applications', 'Martin Kleppmann', 'Tech'], ['Refactoring', 'Martin Fowler', 'Tech'],
  ['Introduction to Algorithms', 'Thomas H. Cormen', 'Tech'], ['You Dont Know JS', 'Kyle Simpson', 'Tech'],
  ['Eloquent JavaScript', 'Marijn Haverbeke', 'Tech'], ['The Mythical Man-Month', 'Fred Brooks', 'Tech'],
  ['Dune', 'Frank Herbert', 'Sci-Fi'], ['Foundation', 'Isaac Asimov', 'Sci-Fi'],
  ['Neuromancer', 'William Gibson', 'Sci-Fi'], ['The Left Hand of Darkness', 'Ursula K. Le Guin', 'Sci-Fi'],
  ['Snow Crash', 'Neal Stephenson', 'Sci-Fi'], ['Hyperion', 'Dan Simmons', 'Sci-Fi'],
  ['Pride and Prejudice', 'Jane Austen', 'Classic'], ['Great Expectations', 'Charles Dickens', 'Classic'],
  ['Moby-Dick', 'Herman Melville', 'Classic'], ['Jane Eyre', 'Charlotte Bronte', 'Classic'],
  ['Wuthering Heights', 'Emily Bronte', 'Classic'], ['The Brothers Karamazov', 'Fyodor Dostoevsky', 'Classic'],
  ['Sapiens', 'Yuval Noah Harari', 'History'], ['Guns, Germs, and Steel', 'Jared Diamond', 'History'],
  ['The Discovery of India', 'Jawaharlal Nehru', 'History'], ['India After Gandhi', 'Ramachandra Guha', 'History'],
  ['Wings of Fire', 'A. P. J. Abdul Kalam', 'Biography'], ['The Story of My Experiments with Truth', 'M. K. Gandhi', 'Biography'],
  ['Long Walk to Freedom', 'Nelson Mandela', 'Biography'], ['Steve Jobs', 'Walter Isaacson', 'Biography'],
  ['The God of Small Things', 'Arundhati Roy', 'Fiction'], ['Midnights Children', 'Salman Rushdie', 'Fiction'],
  ['The Guide', 'R. K. Narayan', 'Fiction'], ['Malgudi Days', 'R. K. Narayan', 'Fiction'],
  ['The Alchemist', 'Paulo Coelho', 'Fiction'], ['1984', 'George Orwell', 'Fiction'],
  ['To Kill a Mockingbird', 'Harper Lee', 'Fiction'], ['Atomic Habits', 'James Clear', 'Self-help'],
  ['Deep Work', 'Cal Newport', 'Self-help'], ['Thinking, Fast and Slow', 'Daniel Kahneman', 'Self-help'],
  ['The Lean Startup', 'Eric Ries', 'Business'], ['Zero to One', 'Peter Thiel', 'Business'],
];
const NAMES = ['Anitha Rao', 'Karthik Subramanian', 'Divya Menon', 'Rahul Verma', 'Priya Nair', 'Suresh Kumar', 'Meena Iyer', 'Arjun Reddy', 'Lakshmi Devi', 'Vikram Singh'];

async function main() {
  await applyConstraints(prisma);
  await prisma.$executeRawUnsafe('TRUNCATE "FinePayment","Fine","Reservation","Loan","Book","Setting","User" RESTART IDENTITY CASCADE');
  const now = new Date();
  const hash = await bcrypt.hash('Password123!', 10);

  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) await prisma.setting.create({ data: { key, value } });
  await prisma.user.create({ data: { name: 'Head Librarian', email: 'librarian@library.test', passwordHash: hash, role: 'LIBRARIAN' } });
  const members: any[] = [];
  for (let i = 0; i < 10; i++)
    members.push(await prisma.user.create({ data: { name: NAMES[i], email: `member${i + 1}@library.test`, passwordHash: hash } }));

  const books: any[] = [];
  for (let i = 0; i < BOOKS.length; i++) {
    const [title, author, genre] = BOOKS[i];
    // every 5th book has a single copy, which makes the reservation queue easy to demo
    books.push(await prisma.book.create({ data: { title, author, genre, totalCopies: i % 5 === 0 ? 1 : (i % 4) + 2 } }));
  }

  // 24 active loans (10 overdue) ...
  for (let i = 0; i < 24; i++) {
    const days = i % 5 === 0 ? 25 : i % 5 === 1 ? 16 : (i % 9) + 1;
    const borrowedAt = new Date(now.getTime() - days * DAY_MS);
    await prisma.loan.create({
      data: { bookId: books[i].id, memberId: members[i % 10].id, borrowedAt, dueAt: new Date(borrowedAt.getTime() + SETTING_DEFAULTS.LOAN_PERIOD_DAYS * DAY_MS) },
    });
  }
  // ... plus 1 returned-late loan with an unpaid fine that blocks member 10 (25 loans total)
  const borrowedAt = new Date(now.getTime() - 40 * DAY_MS);
  const dueAt = new Date(borrowedAt.getTime() + 14 * DAY_MS);
  const returnedAt = new Date(now.getTime() - 2 * DAY_MS);
  const late = await prisma.loan.create({ data: { bookId: books[30].id, memberId: members[9].id, borrowedAt, dueAt, returnedAt } });
  const f = calculateFine(dueAt, returnedAt, SETTING_DEFAULTS.FINE_PER_DAY, SETTING_DEFAULTS.FINE_CAP);
  await prisma.fine.create({ data: { loanId: late.id, memberId: members[9].id, daysLate: f.daysLate, amount: f.amount, createdAt: returnedAt } });

  // two members already queued for the single-copy book 0
  await prisma.reservation.create({ data: { bookId: books[0].id, memberId: members[5].id, createdAt: new Date(now.getTime() - HOUR_MS) } });
  await prisma.reservation.create({ data: { bookId: books[0].id, memberId: members[6].id, createdAt: new Date(now.getTime() - HOUR_MS / 2) } });

  console.log('Seeded: 40 books, 10 members + 1 librarian, 25 loans, 2 reservations.');
  console.log('Logins: librarian@library.test / member1..10@library.test, password: Password123!');
}
main().finally(() => prisma.$disconnect());

