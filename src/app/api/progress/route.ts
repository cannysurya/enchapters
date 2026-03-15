import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { bookId, scrollPosition, timeSpentSeconds } = await request.json();

        if (!bookId) {
            return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });
        }

        const progress = await prisma.readingProgress.upsert({
            where: {
                userId_bookId: {
                    userId: session.user.id,
                    bookId: bookId,
                },
            },
            update: {
                scrollPosition: typeof scrollPosition === 'number' ? scrollPosition : undefined,
                timeSpentSeconds: { increment: timeSpentSeconds || 0 },
            },
            create: {
                userId: session.user.id,
                bookId: bookId,
                scrollPosition: scrollPosition || 0,
                timeSpentSeconds: timeSpentSeconds || 0,
            },
        });

        return NextResponse.json({ success: true, progress });
    } catch (error) {
        console.error('Error saving progress:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
