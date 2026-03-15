'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styles from './reader.module.css';
import { useNav } from '@/context/NavContext';
import React from 'react';

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
    const [showSelectionIcon, setShowSelectionIcon] = useState(false);
    const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    const { setNavTitle } = useNav();

    // Set/Clear Nav Title
    useEffect(() => {
        setNavTitle(book.title);
        return () => setNavTitle(null);
    }, [book.title, setNavTitle]);

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
        if (selection && selection.toString().trim().length > 0 && contentRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = contentRef.current.parentElement?.getBoundingClientRect();

            if (containerRect) {
                setSelectionCoords({
                    top: rect.top - containerRect.top - 45,
                    left: rect.left - containerRect.left + (rect.width / 2),
                });
                setCurrentSelection({
                    text: selection.toString(),
                    range: range.cloneRange(),
                });
                setShowSelectionIcon(true);
            }
        } else {
            // Only hide if we aren't currently entering a note
            if (!showNoteInput) {
                setShowSelectionIcon(false);
                setSelectionCoords(null);
            }
        }
    };

    const handleIconClick = () => {
        setShowNoteInput(true);
        setActiveTab('notes');
        setShowMobileSidebar(true);
        setShowSelectionIcon(false);
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

    // Memoize processed content to prevent innerHTML reset on re-render (which clears selection)
    const processedContent = useMemo(() => {
        return book.content
            .replace(/<h1/g, '<div class="chapter-separator" aria-hidden="true"><span>·  ✶  ·</span></div><h1')
            .replace(/<h2/g, '<div class="chapter-break" aria-hidden="true"></div><h2');
    }, [book.content]);

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


            <BookContent
                title={book.title}
                processedContent={processedContent}
                contentRef={contentRef}
                handleSelection={handleSelection}
            />

            {showSelectionIcon && selectionCoords && (
                <button
                    className={styles.selectionNoteIcon}
                    style={{
                        top: selectionCoords.top,
                        left: selectionCoords.left,
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onMouseUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleIconClick();
                    }}
                >
                    📝
                </button>
            )}

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
                        className={`${styles.tabBtn} ${activeTab === 'bookmarks' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('bookmarks')}
                    >
                        🔖 Bookmarks
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'notes' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('notes')}
                    >
                        📝 Notes
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

// Separate memoized component for book content to prevent selection loss on parent re-renders
const BookContent = React.memo(({
    title,
    processedContent,
    contentRef,
    handleSelection
}: {
    title: string;
    processedContent: string;
    contentRef: React.RefObject<HTMLDivElement | null>;
    handleSelection: () => void;
}) => {
    return (
        <main
            className={styles.contentArea}
            ref={contentRef}
            onMouseUp={handleSelection}
            onTouchEnd={handleSelection}
        >
            <h1 className={styles.bookTitle}>{title}</h1>
            <div
                className={styles.htmlContent}
                dangerouslySetInnerHTML={{ __html: processedContent }}
            />
        </main>
    );
});

BookContent.displayName = 'BookContent';
