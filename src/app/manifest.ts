import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Enchapters',
    short_name: 'Enchapters',
    description: 'Immerse yourself in a breezy reading experience.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f7fb',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
