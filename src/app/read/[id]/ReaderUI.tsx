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
    const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('bookmarks');
    const [bookmarkLabel, setBookmarkLabel] = useState('');
    const [showBookmarkInput, setShowBookmarkInput] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showBottomNav, setShowBottomNav] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const isPointerDownRef = useRef(false);

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
            
            // Calculate simulated pages
            const visibleHeight = window.innerHeight;
            const total = Math.max(1, Math.ceil(document.documentElement.scrollHeight / visibleHeight));
            const current = Math.min(total, Math.floor(scrollTop / visibleHeight) + 1);
            setTotalPages(total);
            setCurrentPage(current);

            saveProgressDebounced();
        };

        // Recalculate pages on resize
        const handleResize = () => {
            handleScroll();
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);
        
        // Timeout to ensure content is fully loaded and painted before initial measurement
        const timeoutId = setTimeout(handleScroll, 200);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, [saveProgressDebounced]);

    const handleSelection = useCallback(() => {
        if (isPointerDownRef.current) return;

        const selection = window.getSelection();
        const hasSelection = selection && selection.toString().trim().length > 0;
        const inReader = hasSelection && contentRef.current?.contains(selection.anchorNode);

        if (inReader) {
            const range = selection.getRangeAt(0);
            setCurrentSelection({
                text: selection.toString(),
                range: range.cloneRange(),
            });

            if (activeTab === 'notes') {
                setShowNoteInput(true);
            }
        } else {
            // If we're currently typing a note, don't clear the selection 
            // just because the focus moved to the textarea.
            if (showNoteInput) return;

            // Only clear selection if we're not in an input/textarea
            const isFocusInInput = document.activeElement instanceof HTMLTextAreaElement || 
                                 document.activeElement instanceof HTMLInputElement;
            if (!isFocusInInput) {
                setCurrentSelection(null);
                setShowNoteInput(false);
            }
        }
    }, [activeTab, showNoteInput]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        const onSelectionChange = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleSelection();
            }, 150); // Debounce to allow selection handles to settle
        };

        const handlePointerDown = (e: PointerEvent | MouseEvent | TouchEvent) => {
            isPointerDownRef.current = true;
        };

        const handlePointerUp = () => {
            isPointerDownRef.current = false;
            setTimeout(() => {
                handleSelection();
            }, 50);
        };
        
        document.addEventListener('selectionchange', onSelectionChange);
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('pointerup', handlePointerUp);
        // Fallbacks for Safari/mobile if pointer events fail
        document.addEventListener('touchstart', handlePointerDown, { passive: true });
        document.addEventListener('touchend', handlePointerUp);

        return () => {
            document.removeEventListener('selectionchange', onSelectionChange);
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('touchend', handlePointerUp);
            clearTimeout(timeoutId);
        };
    }, [handleSelection]);

    const handleContentClick = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            return; // Document something is selected, don't toggle nav
        }
        if (!showNoteInput) {
            setCurrentSelection(null); // Clear cached selection if nothing is truly highlighted
        }
        setShowBottomNav(prev => !prev);
    };

    const saveAnnotation = async () => {
        if (!currentSelection) return;

        const currentScroll = Math.round(window.scrollY);
        const pageNum = currentPage;

        const newAnnotation = {
            id: Date.now().toString(),
            text: currentSelection.text,
            note: noteText,
            rangeData: JSON.stringify({
                scrollPosition: currentScroll,
                pageNumber: pageNum,
            }),
        };

        setAnnotations([...annotations, newAnnotation]);
        setShowNoteInput(false);
        setNoteText('');
        setCurrentSelection(null); // Clear selection after saving

        try {
            await fetch('/api/annotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: book.id,
                    text: currentSelection.text,
                    note: noteText || null,
                    rangeData: newAnnotation.rangeData,
                }),
            });
        } catch (err) {
            console.error('Error saving annotation:', err);
        }
    };

    const addBookmark = async () => {
        const scrollPos = Math.round(window.scrollY);
        const pageNum = currentPage;
        const baseLabel = bookmarkLabel.trim();
        const label = baseLabel ? `${baseLabel} (Page ${pageNum})` : `Bookmark at Page ${pageNum}`;

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

    const goToAnnotation = (rangeData: string) => {
        try {
            const data = JSON.parse(rangeData);
            if (data.scrollPosition !== undefined) {
                window.scrollTo({ top: data.scrollPosition, behavior: 'smooth' });
            }
        } catch (e) {
            console.error('Failed to parse rangeData for navigation', e);
        }
    };

    // Memoize processed content to prevent innerHTML reset on re-render (which clears selection)
    const processedContent = useMemo(() => {
        return book.content
            .replace(/<h1/g, '<div class="chapter-separator" aria-hidden="true"><span>·  ✶  ·</span></div><h1')
            .replace(/<h2/g, '<div class="chapter-break" aria-hidden="true"></div><h2');
    }, [book.content]);

    return (
        <div className={styles.readerContainer} onClick={handleContentClick}>
            {/* Reading Progress Bar */}
            <div className={styles.progressBarContainer}>
                <div
                    className={styles.progressBar}
                    style={{ width: `${readProgress}%` }}
                />
                <span className={styles.progressText}>Page {currentPage}</span>
            </div>


            <BookContent
                title={book.title}
                processedContent={processedContent}
                contentRef={contentRef}
            />

            {/* Bottom Scrubber Nav */}
            {showBottomNav && (
                <div 
                    className={styles.bottomNavContainer}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.sliderWrapper}>
                        <input 
                            type="range" 
                            min="1" 
                            max={totalPages} 
                            value={currentPage} 
                            onChange={(e) => {
                                const newPage = parseInt(e.target.value, 10);
                                const visibleHeight = window.innerHeight;
                                const targetScroll = (newPage - 1) * visibleHeight;
                                window.scrollTo({ top: targetScroll, behavior: 'auto' });
                                setCurrentPage(newPage);
                            }}
                            className={styles.pageSlider}
                        />
                        <span className={styles.pageIndicator}>{currentPage} / {totalPages}</span>
                    </div>
                </div>
            )}

            {/* Mobile FAB */}
            <button
                className={`${styles.mobileFab} ${showBottomNav ? styles.mobileFabWithNav : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    const selection = window.getSelection();
                    const hasNativeSelection = selection && selection.toString().trim().length > 0;
                    
                    if (hasNativeSelection || (currentSelection && currentSelection.text.trim().length > 0)) {
                        // We need to make sure currentSelection has the exact text
                        if (hasNativeSelection && (!currentSelection || currentSelection.text !== selection.toString())) {
                            setCurrentSelection({
                                text: selection.toString(),
                                range: selection.getRangeAt(0).cloneRange(),
                            });
                        }
                        setShowNoteInput(true);
                        setActiveTab('notes');
                    } else {
                        // Act normally if no text is selected
                        setShowNoteInput(false);
                    }
                    setShowMobileSidebar(true);
                }}
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
                        onClick={() => {
                            setActiveTab('notes');
                            if (currentSelection && currentSelection.text.trim().length > 0) {
                                setShowNoteInput(true);
                            }
                        }}
                    >
                        📝 Notes
                    </button>

                </div>

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className={styles.tabContent}>
                        {showNoteInput && (
                            <div className={styles.noteInputBox}>
                                <div className={styles.noteInputHeader}>
                                    <span className={styles.pageBadge}>Page {currentPage}</span>
                                </div>
                                <p className={styles.selectedQuote}>"{currentSelection?.text}"</p>
                                <textarea
                                    placeholder="Add a note..."
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    className={styles.textarea}
                                />
                                <div className={styles.noteActions}>
                                    <button 
                                        onClick={() => {
                                            setShowNoteInput(false);
                                            setCurrentSelection(null);
                                        }} 
                                        className={styles.cancelBtn}
                                    >
                                        Cancel
                                    </button>
                                    <button onClick={saveAnnotation} className={styles.saveBtn}>Save</button>
                                </div>
                            </div>
                        )}

                        <div className={styles.annotationsList}>
                            {annotations.length === 0 && !showNoteInput && (
                                <p className={styles.emptyAnnotations}>Select text to add highlights and notes.</p>
                            )}
                            {annotations.map((ann) => {
                                let pageNum = null;
                                try {
                                    const data = JSON.parse(ann.rangeData);
                                    pageNum = data.pageNumber;
                                } catch (e) { }

                                return (
                                    <div
                                        key={ann.id}
                                        className={`${styles.annotationCard} ${styles.clickableCard}`}
                                        onClick={() => goToAnnotation(ann.rangeData)}
                                    >
                                        <div className={styles.cardHeader}>
                                            <p className={styles.quote}>"{ann.text}"</p>
                                            {pageNum !== null && <span className={styles.cardPageBadge}>Page {pageNum}</span>}
                                        </div>
                                        {ann.note && <p className={styles.note}>{ann.note}</p>}
                                    </div>
                                );
                            })}
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
    contentRef
}: {
    title: string;
    processedContent: string;
    contentRef: React.RefObject<HTMLDivElement | null>;
}) => {
    return (
        <main
            className={styles.contentArea}
            ref={contentRef}
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
