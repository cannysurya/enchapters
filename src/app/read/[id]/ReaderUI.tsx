'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './reader.module.css';

type Book = { id: string; title: string; content: string };
type Progress = { scrollPosition: number } | null;
type Annotation = { id: string; rangeData: string; text: string; note: string | null };
type Bookmark = { id: string; scrollPosition: number; label: string | null; createdAt: string };

export default function ReaderUI({
    book,
    initialProgress,
    initialAnnotations,
    initialBookmarks,
    userId,
}: {
    book: Book;
    initialProgress: Progress | any;
    initialAnnotations: Annotation[];
    initialBookmarks: Bookmark[];
    userId: string;
}) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks || []);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [currentSelection, setCurrentSelection] = useState<{ text: string; range: any } | null>(null);
    const [noteText, setNoteText] = useState('');
    const [readProgress, setReadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');
    const [bookmarkLabel, setBookmarkLabel] = useState('');
    const [showBookmarkInput, setShowBookmarkInput] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Restore scroll position
    useEffect(() => {
        if (initialProgress?.scrollPosition && contentRef.current) {
            window.scrollTo(0, initialProgress.scrollPosition);
        }
    }, [initialProgress]);

    // Save scroll position periodically + update progress bar
    const saveProgressDebounced = useCallback(
        (() => {
            let timeout: NodeJS.Timeout;
            return () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    fetch('/api/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            bookId: book.id,
                            scrollPosition: Math.round(window.scrollY),
                        }),
                    }).catch(console.error);
                }, 2000);
            };
        })(),
        [book.id]
    );

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            setReadProgress(Math.min(100, Math.max(0, progress)));
            saveProgressDebounced();
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // initial call
        return () => window.removeEventListener('scroll', handleScroll);
    }, [saveProgressDebounced]);

    const handleSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0 && contentRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            setCurrentSelection({
                text: selection.toString(),
                range: range.cloneRange(),
            });
            setShowNoteInput(true);
            setActiveTab('notes');
            setShowMobileSidebar(true); // opens sidebar on mobile; no-op visually on desktop
        } else {
            setShowNoteInput(false);
        }
    };

    const saveAnnotation = async () => {
        if (!currentSelection) return;

        const newAnnotation = {
            id: Date.now().toString(),
            text: currentSelection.text,
            note: noteText,
            rangeData: 'mock-range-data',
        };

        setAnnotations([...annotations, newAnnotation]);
        setShowNoteInput(false);
        setNoteText('');

        try {
            await fetch('/api/annotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: book.id,
                    text: currentSelection.text,
                    note: noteText || null,
                    rangeData: JSON.stringify({ offset: 0 }),
                }),
            });
        } catch (err) {
            console.error('Error saving annotation:', err);
        }
    };

    const addBookmark = async () => {
        const scrollPos = Math.round(window.scrollY);
        const label = bookmarkLabel.trim() || `Bookmark at ${Math.round(readProgress)}%`;

        const tempBookmark: Bookmark = {
            id: Date.now().toString(),
            scrollPosition: scrollPos,
            label,
            createdAt: new Date().toISOString(),
        };

        setBookmarks([tempBookmark, ...bookmarks]);
        setShowBookmarkInput(false);
        setBookmarkLabel('');

        try {
            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId: book.id, scrollPosition: scrollPos, label }),
            });
            const data = await res.json();
            if (data.bookmark) {
                setBookmarks(prev => prev.map(b => b.id === tempBookmark.id ? { ...data.bookmark, createdAt: data.bookmark.createdAt } : b));
            }
        } catch (err) {
            console.error('Error saving bookmark:', err);
        }
    };

    const removeBookmark = async (id: string) => {
        setBookmarks(bookmarks.filter(b => b.id !== id));
        try {
            await fetch('/api/bookmarks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
        } catch (err) {
            console.error('Error deleting bookmark:', err);
        }
    };

    const goToBookmark = (scrollPosition: number) => {
        window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    };

    // Process content to add chapter separators
    const processContent = (html: string) => {
        return html
            .replace(/<h1/g, '<div class="chapter-separator" aria-hidden="true"><span>·  ✶  ·</span></div><h1')
            .replace(/<h2/g, '<div class="chapter-break" aria-hidden="true"></div><h2');
    };

    return (
        <div className={styles.readerContainer}>
            {/* Reading Progress Bar */}
            <div className={styles.progressBarContainer}>
                <div
                    className={styles.progressBar}
                    style={{ width: `${readProgress}%` }}
                />
                <span className={styles.progressText}>{Math.round(readProgress)}%</span>
            </div>

            {/* Clickable scroll track for fast navigation */}
            <div
                className={styles.scrollTrack}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientY - rect.top) / rect.height;
                    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    window.scrollTo({ top: ratio * docHeight, behavior: 'smooth' });
                }}
            >
                <div
                    className={styles.scrollThumb}
                    style={{ height: `${readProgress}%` }}
                />
            </div>

            <main
                className={styles.contentArea}
                ref={contentRef}
                onMouseUp={handleSelection}
                onTouchEnd={handleSelection}
            >
                <h1 className={styles.bookTitle}>{book.title}</h1>
                <div
                    className={styles.htmlContent}
                    dangerouslySetInnerHTML={{ __html: processContent(book.content) }}
                />
            </main>

            {/* Mobile FAB */}
            <button
                className={styles.mobileFab}
                onClick={() => setShowMobileSidebar(true)}
                aria-label="Open notes and bookmarks"
            >
                📝
            </button>

            {/* Sidebar - becomes modal on mobile */}
            {showMobileSidebar && (
                <div className={styles.mobileOverlay} onClick={() => setShowMobileSidebar(false)} />
            )}
            <aside className={`${styles.annotationsSidebar} ${showMobileSidebar ? styles.sidebarOpen : ''}`}>
                <button
                    className={styles.closeSidebarBtn}
                    onClick={() => setShowMobileSidebar(false)}
                >
                    ✕
                </button>
                {/* Tab header */}
                <div className={styles.sidebarTabs}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'notes' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('notes')}
                    >
                        📝 Notes
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'bookmarks' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('bookmarks')}
                    >
                        🔖 Bookmarks
                    </button>
                </div>

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className={styles.tabContent}>
                        {showNoteInput && (
                            <div className={styles.noteInputBox}>
                                <p className={styles.selectedQuote}>"{currentSelection?.text}"</p>
                                <textarea
                                    placeholder="Add a note..."
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    className={styles.textarea}
                                />
                                <div className={styles.noteActions}>
                                    <button onClick={() => setShowNoteInput(false)} className={styles.cancelBtn}>Cancel</button>
                                    <button onClick={saveAnnotation} className={styles.saveBtn}>Save</button>
                                </div>
                            </div>
                        )}

                        <div className={styles.annotationsList}>
                            {annotations.length === 0 && !showNoteInput && (
                                <p className={styles.emptyAnnotations}>Select text to add highlights and notes.</p>
                            )}
                            {annotations.map((ann) => (
                                <div key={ann.id} className={styles.annotationCard}>
                                    <p className={styles.quote}>"{ann.text}"</p>
                                    {ann.note && <p className={styles.note}>{ann.note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bookmarks Tab */}
                {activeTab === 'bookmarks' && (
                    <div className={styles.tabContent}>
                        {!showBookmarkInput ? (
                            <button
                                className={styles.addBookmarkBtn}
                                onClick={() => setShowBookmarkInput(true)}
                            >
                                + Bookmark this position
                            </button>
                        ) : (
                            <div className={styles.noteInputBox}>
                                <input
                                    type="text"
                                    placeholder="Bookmark label (optional)"
                                    value={bookmarkLabel}
                                    onChange={(e) => setBookmarkLabel(e.target.value)}
                                    className={styles.bookmarkInput}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && addBookmark()}
                                />
                                <div className={styles.noteActions}>
                                    <button onClick={() => setShowBookmarkInput(false)} className={styles.cancelBtn}>Cancel</button>
                                    <button onClick={addBookmark} className={styles.saveBtn}>Save</button>
                                </div>
                            </div>
                        )}

                        <div className={styles.annotationsList}>
                            {bookmarks.length === 0 && (
                                <p className={styles.emptyAnnotations}>No bookmarks yet. Add one to save your place.</p>
                            )}
                            {bookmarks.map((bm) => (
                                <div key={bm.id} className={styles.bookmarkCard}>
                                    <div
                                        className={styles.bookmarkInfo}
                                        onClick={() => goToBookmark(bm.scrollPosition)}
                                    >
                                        <span className={styles.bookmarkIcon}>🔖</span>
                                        <div>
                                            <p className={styles.bookmarkLabel}>{bm.label || 'Bookmark'}</p>
                                            <p className={styles.bookmarkMeta}>
                                                {new Date(bm.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        className={styles.removeBookmarkBtn}
                                        onClick={() => removeBookmark(bm.id)}
                                        title="Remove bookmark"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
