'use client';

import { useState } from 'react';
import styles from './dashboard.module.css';

type Book = {
    id: string;
    title: string;
    visibility: 'FREE' | 'EARLY_ACCESS' | 'HIDDEN';
    createdAt: string;
};

const VISIBILITY_LABELS: Record<string, string> = {
    FREE: '🟢 Free',
    EARLY_ACCESS: '🟡 Early Access',
    HIDDEN: '⚫ Hidden',
};

const VISIBILITY_FLOW: Record<string, 'FREE' | 'EARLY_ACCESS' | 'HIDDEN'> = {
    FREE: 'EARLY_ACCESS',
    EARLY_ACCESS: 'HIDDEN',
    HIDDEN: 'FREE',
};

export default function BookList({ initialBooks }: { initialBooks: Book[] }) {
    const [books, setBooks] = useState<Book[]>(initialBooks);
    const [loading, setLoading] = useState<string | null>(null);

    const toggleVisibility = async (id: string, currentVisibility: string) => {
        const newVisibility = VISIBILITY_FLOW[currentVisibility];
        setLoading(id);

        try {
            const res = await fetch(`/api/admin/books/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visibility: newVisibility }),
            });

            if (res.ok) {
                setBooks(books.map(b => b.id === id ? { ...b, visibility: newVisibility } : b));
            }
        } catch {
            console.error('Failed to update visibility');
        } finally {
            setLoading(null);
        }
    };

    const deleteBook = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return;
        }

        setLoading(id);

        try {
            const res = await fetch(`/api/admin/books/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setBooks(books.filter(b => b.id !== id));
            } else {
                alert('Failed to delete book');
            }
        } catch {
            console.error('Failed to delete book');
            alert('An error occurred during deletion');
        } finally {
            setLoading(null);
        }
    };

    if (books.length === 0) {
        return (
            <div className={styles.emptyBooks}>
                <p>📭 No books uploaded yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.booksGrid}>
            {books.map(book => (
                <div key={book.id} className={styles.bookRow}>
                    <div>
                        <p className={styles.bookRowTitle}>{book.title}</p>
                        <p className={styles.bookRowMeta}>Added {new Date(book.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <span className={`${styles.badge} ${styles[`badge${book.visibility}`]}`}>
                        {VISIBILITY_LABELS[book.visibility]}
                    </span>
                    <div className={styles.bookRowActions}>
                        <button
                            onClick={() => toggleVisibility(book.id, book.visibility)}
                            className={styles.actionBtn}
                            disabled={loading === book.id}
                        >
                            {loading === book.id ? '...' : 'Change'}
                        </button>
                        <button
                            onClick={() => deleteBook(book.id, book.title)}
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            disabled={loading === book.id}
                        >
                            {loading === book.id ? '...' : 'Delete'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
