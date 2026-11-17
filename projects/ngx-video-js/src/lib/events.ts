import type { VideoPlayerElement } from '@videojs/html/video';

/**
 * The element that plays the media: a native `<video>`, or one of the Video.js
 * custom media elements (`<hlsjs-video>`, `<youtube-video>`, …). They all
 * expose the `HTMLMediaElement` playback surface, which is what this type
 * promises — anything beyond it depends on the provider.
 */
export type VideoMedia = HTMLElement &
  Pick<
    HTMLMediaElement,
    | 'currentTime'
    | 'duration'
    | 'paused'
    | 'ended'
    | 'seeking'
    | 'readyState'
    | 'playbackRate'
    | 'volume'
    | 'muted'
    | 'loop'
    | 'play'
    | 'pause'
  > &
  Partial<Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>>;

/**
 * The `<video-player>` state store. Every Video.js control reads from and acts
 * through it; its state is on `store.state` and `store.subscribe()` notifies on
 * change. Reach for it for anything the component's own methods do not cover —
 * volume, captions, quality, picture-in-picture.
 */
export type VideoPlayerStore = VideoPlayerElement['store'];

/** Emitted by `(timeUpdate)`, at the media's own `timeupdate` cadence (~4 Hz). */
export interface VideoTimeUpdate {
  currentTime: number;
  /** `NaN` until metadata loads, `Infinity` for a live stream. */
  duration: number;
}

/** Emitted by `(metadataLoaded)` once the duration and dimensions are known. */
export interface VideoMetadata {
  duration: number;
  /** `0` for embeds (YouTube, Vimeo), which do not report their dimensions. */
  videoWidth: number;
  videoHeight: number;
}

/** Emitted by `(seekBlocked)` when `seekGuard` refuses a seek and snaps back. */
export interface VideoSeekBlocked {
  /** Where the viewer tried to go. */
  attempted: number;
  /** Where playback was put back to. */
  restored: number;
}

/**
 * What `seekGuard` lets through.
 *
 * - `'off'` — anything.
 * - `'forward'` — rewinding, and seeking forward up to the furthest point
 *   reached by playing (`watchedUntil` raises that floor). The usual rule for
 *   compliance and course content.
 * - `'all'` — no seeking at all. Restarting from the end and looping still
 *   work.
 */
export type VideoSeekGuard = 'off' | 'forward' | 'all';
