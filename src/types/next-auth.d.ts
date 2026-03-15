import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: 'USER' | 'MEMBER' | 'ADMIN';
        } & DefaultSession['user'];
    }

    interface User {
        id: string;
        role: 'USER' | 'MEMBER' | 'ADMIN';
    }
}
