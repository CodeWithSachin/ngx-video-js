/**
 * Which media element plays the source.
 *
 * `hls` resolves to `<hlsjs-video>` rather than the lighter `<hls-video>`: the
 * quality and audio-track menus read their options from hls.js, so the slim
 * element would leave those menus permanently unavailable.
 */
export type VideoProvider = 'video' | 'hls' | 'dash' | 'youtube' | 'vimeo';

/** `provider` accepts `'auto'` too, which picks one of the above from `src`. */
export type VideoProviderInput = VideoProvider | 'auto';

/**
 * Which skin renders the UI.
 *
 * `video` and `live` are the packaged skins, each a shadow-DOM element pair —
 * `live` has its own controls, a LIVE pill and a DVR window, rather than being
 * a mode of the on-demand one.
 *
 * `custom` is the default video skin ejected into this package's own template,
 * where every part sits behind an `@if` and answers to the `controls` input.
 */
export type VideoSkin = 'video' | 'live' | 'custom';

const MEDIA_LOADERS: Record<Exclude<VideoProvider, 'video'>, () => Promise<unknown>> = {
  hls: () => import('@videojs/html/media/hlsjs-video'),
  dash: () => import('@videojs/html/media/dash-video'),
  youtube: () => import('@videojs/html/media/youtube-video'),
  vimeo: () => import('@videojs/html/media/vimeo-video'),
};

/**
 * The player element goes first. UI elements look for its context when they
 * connect, and one that upgrades ahead of it logs a "requires … feature"
 * warning for every control.
 */
const SKIN_LOADERS: Record<VideoSkin, () => Promise<unknown>> = {
  video: () => import('@videojs/html/video/player').then(() => import('@videojs/html/video/skin')),
  live: () =>
    import('@videojs/html/live-video/player').then(() => import('@videojs/html/live-video/skin')),
  // The ejected skin renders the UI elements itself, so it needs the whole set
  // plus <media-icon>, and no packaged skin element at all. Since 10.5.0
  // `video/ui` no longer defines <video-player>, so that is imported here.
  custom: () =>
    import('@videojs/html/video/player').then(() =>
      Promise.all([
        import('@videojs/html/video/ui'),
        import('@videojs/html/icons/element/default'),
      ]),
    ),
};

const loaded = new Map<string, Promise<unknown>>();

function once(key: string, load: () => Promise<unknown>): Promise<unknown> {
  let pending = loaded.get(key);
  if (!pending) loaded.set(key, (pending = load()));
  return pending;
}

/**
 * Registers the Video.js 10 custom elements — `<video-player>`, `<video-skin>`,
 * `<media-i18n>` and every UI element the skin uses — plus the media element for
 * `provider`.
 *
 * Each module is imported once per document, and the whole thing is a no-op
 * without `customElements`, so calling it from a route resolver is safe during
 * server rendering.
 *
 * The skin ships its own styles — global rules via `ensureGlobalStyle` and the
 * skin CSS through `adoptedStyleSheets` inside its shadow root — so there is no
 * stylesheet for consumers to import.
 */
export function loadVideoJsElements(
  provider: VideoProvider = 'video',
  skin: VideoSkin = 'video',
): Promise<unknown> {
  if (typeof customElements === 'undefined') return Promise.resolve();

  const media = provider === 'video' ? null : MEDIA_LOADERS[provider];

  // The media element registers with the player when it connects, so it is
  // defined once the player is — fetched in parallel, upgraded after.
  const player = customElements.whenDefined(skin === 'live' ? 'live-video-player' : 'video-player');

  return Promise.all([
    once(`skin:${skin}`, SKIN_LOADERS[skin]),
    // Defines <media-i18n>. Locale packs load themselves, and only when the
    // resolved language is not English.
    once('i18n', () => import('@videojs/html/i18n')),
    media ? player.then(() => once(provider, media)) : null,
  ]);
}

/**
 * Picks a media element from the URL: YouTube and Vimeo watch/embed links by
 * host, HLS and DASH by manifest extension, everything else by the browser's
 * own `<video>`.
 */
export function detectProvider(src: string): VideoProvider {
  const host = hostOf(src);
  if (host === 'youtu.be' || /(?:^|\.)youtube(?:-nocookie)?\.com$/.test(host)) return 'youtube';
  if (/(?:^|\.)vimeo\.com$/.test(host)) return 'vimeo';

  // Query strings carry signing tokens and playback params — match on the path.
  const path = src.split(/[?#]/)[0];
  if (/\.m3u8$/i.test(path)) return 'hls';
  if (/\.mpd$/i.test(path)) return 'dash';
  return 'video';
}

/** Hostname of an absolute URL. Relative paths resolve against a sentinel host. */
function hostOf(src: string): string {
  try {
    return new URL(src, 'https://relative.invalid').hostname.toLowerCase();
  } catch {
    return '';
  }
}
