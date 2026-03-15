import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import ReaderUI from './ReaderUI';

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/api/auth/signin');
    }

    const { id } = await params;

    const book = await prisma.book.findUnique({
        where: { id },
    });

    if (!book) {
        notFound();
    }

    // Handle access control for EARLY_ACCESS books (Skip logic for MVP, assuming simple check)
    if (book.visibility === 'EARLY_ACCESS' && session.user.role !== 'ADMIN') {
        const access = await prisma.userAccess.findUnique({
            where: {
                userId_bookId: {
                    userId: session.user.id,
                    bookId: book.id,
                },
            },
        });

        if (!access) {
            return (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                    <h2>Access Denied</h2>
                    <p>This book requires special access.</p>
                </div>
            );
        }
    }

    // Fetch user's previous progress and annotations
    const progress = await prisma.readingProgress.findUnique({
        where: {
            userId_bookId: {
                userId: session.user.id,
                bookId: book.id,
            },
        },
    });

    const annotations = await prisma.annotation.findMany({
        where: {
            userId: session.user.id,
            bookId: book.id,
        },
    });

    const bookmarks = await prisma.bookmark.findMany({
        where: {
            userId: session.user.id,
            bookId: book.id,
        },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <ReaderUI
            book={book}
            initialProgress={progress}
            initialAnnotations={annotations}
            initialBookmarks={bookmarks.map((b: any) => ({
                ...b,
                createdAt: b.createdAt.toISOString(),
            }))}
            userId={session.user.id}
        />
    );
}
