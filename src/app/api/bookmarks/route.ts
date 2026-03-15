import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const bookId = searchParams.get('bookId');

        if (!bookId) {
            return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });
        }

        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: session.user.id, bookId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ bookmarks });
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { bookId, scrollPosition, label } = await request.json();

        if (!bookId || scrollPosition === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const bookmark = await prisma.bookmark.create({
            data: {
                userId: session.user.id,
                bookId,
                scrollPosition,
                label: label || `Page bookmark`,
            },
        });

        return NextResponse.json({ success: true, bookmark });
    } catch (error) {
        console.error('Error saving bookmark:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing bookmark id' }, { status: 400 });
        }

        await prisma.bookmark.delete({
            where: { id, userId: session.user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting bookmark:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
