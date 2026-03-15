import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch all free books (we can add logic for EARLY_ACCESS later)
  const books = await prisma.book.findMany({
    where: {
      visibility: 'FREE',
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      coverImage: true,
      createdAt: true,
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
