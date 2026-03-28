'use client';

import { useState } from 'react';
import styles from './dashboard.module.css';

type User = {
    id: string;
    name: string | null;
    email: string;
    role: 'USER' | 'MEMBER' | 'ADMIN';
    image: string | null;
    createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
    USER: '👤 User',
    MEMBER: '✨ Member',
    ADMIN: '🛡️ Admin',
};

const ROLE_FLOW: Record<string, 'USER' | 'MEMBER' | 'ADMIN'> = {
    USER: 'MEMBER',
    MEMBER: 'ADMIN',
    ADMIN: 'USER',
};

export default function UserList({ initialUsers }: { initialUsers: User[] }) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [loading, setLoading] = useState<string | null>(null);

    const toggleRole = async (id: string, currentRole: string) => {
        const newRole = ROLE_FLOW[currentRole];
        setLoading(id);

        try {
            const res = await fetch(`/api/admin/users`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id, role: newRole }),
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
            }
        } catch {
            console.error('Failed to update role');
        } finally {
            setLoading(null);
        }
    };

    if (users.length === 0) {
        return (
            <div className={styles.emptyBooks}>
                <p>📭 No users found.</p>
            </div>
        );
    }

    return (
        <div className={styles.booksGrid}>
            {users.map(user => (
                <div key={user.id} className={styles.bookRow}>
                    <div className={styles.userInfo}>
                        {user.image && <img src={user.image} alt={user.name || ''} className={styles.userAvatar} />}
                        {!user.image && <div className={styles.userAvatarFallback}>{user.name?.[0] || user.email[0]}</div>}
                        <div>
                            <p className={styles.bookRowTitle}>{user.name || 'Anonymous'}</p>
                            <p className={styles.bookRowMeta}>{user.email}</p>
                        </div>
                    </div>
                    <span className={`${styles.badge} ${styles[`badge${user.role}`]}`}>
                        {ROLE_LABELS[user.role]}
                    </span>
                    <div className={styles.bookRowActions}>
                        <button
                            onClick={() => toggleRole(user.id, user.role)}
                            className={styles.actionBtn}
                            disabled={loading === user.id}
                        >
                            {loading === user.id ? '...' : 'Change Role'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
