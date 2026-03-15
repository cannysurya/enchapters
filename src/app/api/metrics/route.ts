import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        const { eventType, metadata } = await request.json();

        if (!eventType) {
            return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
        }

        const metric = await prisma.metricEvent.create({
            data: {
                userId: session?.user?.id || undefined,
                eventType,
                metadata: JSON.stringify(metadata || {}),
            },
        });

        return NextResponse.json({ success: true, metric });
    } catch (error) {
        console.error('Error saving metric:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
