/**
 * URLs de música de ejemplo para pruebas
 * Estas son URLs públicas de dominio público o de prueba
 */

export interface SampleTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export const SAMPLE_TRACKS: SampleTrack[] = [
  {
    id: 'sample-1',
    title: 'Sample Audio 1',
    artist: 'Test Track',
    // URL de audio de prueba - música libre de derechos
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'sample-2',
    title: 'Sample Audio 2',
    artist: 'Test Track',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'sample-3',
    title: 'Classical Music Sample',
    artist: 'Public Domain',
    // Música clásica de dominio público
    url: 'https://archive.org/download/MozartEineKleineNachtmusik/Mozart%20-%20Eine%20kleine%20Nachtmusik.mp3',
  },
  {
    id: 'sample-4',
    title: 'Jazz Sample',
    artist: 'Public Domain',
    url: 'https://archive.org/download/78_blue-moon_benny-goodman-and-his-orchestra-benny-goodman_gbia0001827a/78_blue-moon_benny-goodman-and-his-orchestra-benny-goodman_gbia0001827a.mp3',
  },
];

// URL de ejemplo por defecto
export const DEFAULT_SAMPLE_TRACK = SAMPLE_TRACKS[0];

