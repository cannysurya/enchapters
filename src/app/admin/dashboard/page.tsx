import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UploadBookForm from './UploadBookForm';
import BookList from './BookList';
import UserList from './UserList';
import styles from './dashboard.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        redirect('/');
    }

    const books = await prisma.book.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, visibility: true, createdAt: true }
    });

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            createdAt: true,
        },
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerBadge}>⚙ Admin Panel</div>
                    <h1>Dashboard</h1>
                    <p>Manage your published books and content.</p>
                </div>
            </header>

            <main className={styles.main}>
                {/* Upload Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.cardIcon} ${styles.cardIconUpload}`}>📤</div>
                        <div>
                            <p className={styles.cardTitle}>Upload New Book</p>
                            <p className={styles.cardSubtitle}>Add a .docx file to publish</p>
                        </div>
                    </div>
                    <div className={styles.cardBody}>
                        <UploadBookForm />
                    </div>
                </div>

                {/* Book List Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.cardIcon} ${styles.cardIconBooks}`}>📚</div>
                        <div>
                            <p className={styles.cardTitle}>Book Catalog</p>
                            <p className={styles.cardSubtitle}>{books.length} book{books.length !== 1 ? 's' : ''} published</p>
                        </div>
                    </div>
                    <BookList initialBooks={books.map((b: any) => ({ ...b, createdAt: b.createdAt.toISOString() }))} />
                </div>

                {/* User List Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.cardIcon} ${styles.cardIconUsers}`}>👥</div>
                        <div>
                            <p className={styles.cardTitle}>User Management</p>
                            <p className={styles.cardSubtitle}>{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
                        </div>
                    </div>
                    <UserList initialUsers={users.map((u: any) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />
                </div>
            </main>
        </div>
    );
}
