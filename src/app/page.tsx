import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './page.module.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VISIBILITY_LABELS: Record<string, string> = {
  FREE: '🟢 Free',
  EARLY_ACCESS: '🟡 Early Access',
  HIDDEN: '⚫ Hidden',
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role || 'GUEST';

  // Role-based visibility logic:
  // - ADMIN: sees EVERYTHING
  // - MEMBER: sees FREE + EARLY_ACCESS
  // - GUEST/USER: sees only FREE
  let visibilityFilter: any = { visibility: 'FREE' };

  if (role === 'ADMIN') {
    visibilityFilter = {}; // No filter for admins
  } else if (role === 'MEMBER') {
    visibilityFilter = {
      visibility: { in: ['FREE', 'EARLY_ACCESS'] }
    };
  }

  const books = await prisma.book.findMany({
    where: visibilityFilter,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      coverImage: true,
      createdAt: true,
      visibility: true,
    },
  });

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Welcome to Enchapters</h1>
          <p>Immerse yourself in a breezy reading experience.</p>
        </div>
      </header>

      <section className={styles.library}>
        <h2>Available Books</h2>
        {books.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No books available yet. Check back soon!</p>
          </div>
        ) : (
          <div className={styles.bookGrid}>
            {books.map((book: any) => (
              <Link href={`/read/${book.id}`} key={book.id} className={styles.bookCard}>
                <span className={`${styles.badge} ${styles[`badge${book.visibility}`]}`}>
                  {VISIBILITY_LABELS[book.visibility]}
                </span>
                <div className={styles.bookCover}>
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} />
                  ) : (
                    <div className={styles.placeholderCover}>
                      <span>{book.title.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className={styles.bookInfo}>
                  <h3>{book.title}</h3>
                  <p>Read beautifully &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
