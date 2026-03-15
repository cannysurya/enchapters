'use client';

import { useState } from 'react';
import styles from './dashboard.module.css';

export default function UploadBookForm() {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [visibility, setVisibility] = useState('FREE');
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return;

        setIsUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('file', file);
        formData.append('visibility', visibility);

        try {
            const res = await fetch('/api/admin/books', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: '✅ Book uploaded and processed successfully!' });
                setTitle('');
                setFile(null);
                // Refresh the page to show the new book in the list
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setMessage({ type: 'error', text: `❌ ${data.error || 'Upload failed'}` });
            }
        } catch {
            setMessage({ type: 'error', text: '❌ Network error during upload.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {/* Title */}
            <div className={styles.formGroup}>
                <label htmlFor="title">Book Title</label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Art of Living"
                    required
                    className={styles.input}
                />
            </div>

            {/* Visibility */}
            <div className={styles.formGroup}>
                <label htmlFor="visibility">Access Level</label>
                <select
                    id="visibility"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className={styles.select}
                >
                    <option value="FREE">🟢 Free — visible to all signed-in users</option>
                    <option value="EARLY_ACCESS">🟡 Early Access — requires approval</option>
                    <option value="HIDDEN">⚫ Hidden — not visible to anyone</option>
                </select>
            </div>

            {/* File Upload */}
            <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label>Word Document</label>
                <div className={`${styles.fileDropZone} ${file ? styles.fileDropZoneActive : ''}`}>
                    <input
                        id="file"
                        type="file"
                        accept=".docx"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        required
                    />
                    <div className={styles.fileIcon}>📄</div>
                    {file ? (
                        <p className={styles.fileSelected}>✓ {file.name}</p>
                    ) : (
                        <>
                            <p className={styles.fileDropText}>Click to choose or drag & drop</p>
                            <p className={styles.fileDropHint}>.docx files only</p>
                        </>
                    )}
                </div>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={isUploading || !file || !title}
                className={styles.submitBtn}
            >
                {isUploading ? '⏳ Processing Document...' : '🚀 Publish Book'}
            </button>

            {/* Message */}
            {message && (
                <p className={message.type === 'success' ? styles.messageSuccess : styles.messageError}>
                    {message.text}
                </p>
            )}
        </form>
    );
}
