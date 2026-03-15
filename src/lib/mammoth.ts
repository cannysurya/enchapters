import mammoth from 'mammoth';

export async function parseWordDocument(buffer: Buffer): Promise<string> {
    const options = {
        styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Subtitle'] => h2:fresh",
        ]
    };

    const result = await mammoth.convertToHtml({ buffer }, options);

    if (result.messages.length > 0) {
        console.warn('Mammoth parsing messages:', result.messages);
    }

    return result.value;
}
