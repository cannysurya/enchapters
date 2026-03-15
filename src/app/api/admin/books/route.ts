import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseWordDocument } from '@/lib/mammoth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const title = formData.get('title') as string;
        const visibility = formData.get('visibility') as 'FREE' | 'EARLY_ACCESS' | 'HIDDEN';

        if (!file || !title) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const htmlContent = await parseWordDocument(buffer);

        const book = await prisma.book.create({
            data: {
                title,
                content: htmlContent,
                visibility: visibility || 'HIDDEN',
            },
        });

        return NextResponse.json({ success: true, book });
    } catch (error) {
        console.error('Error uploading book:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
