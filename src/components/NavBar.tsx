'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import styles from './NavBar.module.css';
import { useNav } from '@/context/NavContext';

export default function NavBar() {
    const { data: session, status } = useSession();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { navTitle } = useNav();

    return (
        <nav className={styles.navbar}>
            <div className={styles.navContainer}>
                <div className={styles.logo}>
                    {navTitle ? (
                        <div className={styles.dynamicHeader}>
                            <Link href="/" className={styles.homeIcon} title="Back to Library">
                                ⬅
                            </Link>
                            <span className={styles.navBookTitle}>{navTitle}</span>
                        </div>
                    ) : (
                        <Link href="/">Enchapters.</Link>
                    )}
                </div>

                <div className={styles.actions}>
                    {status === 'loading' ? (
                        <div className={styles.spinner} />
                    ) : session ? (
                        <div className={styles.profileWrapper} ref={dropdownRef}>
                            <button
                                className={styles.profileBtn}
                                onClick={() => setShowDropdown(!showDropdown)}
                            >
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="Profile" className={styles.avatar} />
                                ) : (
                                    <div className={styles.avatarFallback}>
                                        {session.user?.name?.charAt(0) || '?'}
                                    </div>
                                )}
                            </button>

                            {showDropdown && (
                                <div className={styles.dropdown}>
                                    <div className={styles.dropdownHeader}>
                                        <p className={styles.dropdownName}>{session.user?.name}</p>
                                        <p className={styles.dropdownEmail}>{session.user?.email}</p>
                                    </div>
                                    <div className={styles.dropdownDivider} />
                                    {session.user?.role === 'ADMIN' && (
                                        <Link
                                            href="/admin/dashboard"
                                            className={styles.dropdownItem}
                                            onClick={() => setShowDropdown(false)}
                                        >
                                            📊 Dashboard
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => signOut()}
                                        className={styles.dropdownItem}
                                    >
                                        🚪 Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button onClick={() => signIn('google')} className={styles.loginBtn}>
                            Sign in with Google
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
