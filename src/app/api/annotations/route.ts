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

        const { bookId, text, note, rangeData } = await request.json();

        if (!bookId || !text || !rangeData) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const annotation = await prisma.annotation.create({
            data: {
                userId: session.user.id,
                bookId,
                text,
                note,
                rangeData,
            },
        });

        return NextResponse.json({ success: true, annotation });
    } catch (error) {
        console.error('Error saving annotation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
