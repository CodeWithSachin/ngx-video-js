import { NgTemplateOutlet } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  detectProvider,
  loadVideoJsElements,
  type VideoProvider,
  type VideoProviderInput,
  type VideoSkin,
} from './load-elements';
import { NgxVideoSkin } from './video-skin.component';
import type { VideoControls } from './controls';
import type {
  VideoMedia,
  VideoMetadata,
  VideoPlayerStore,
  VideoSeekBlocked,
  VideoSeekGuard,
  VideoTimeUpdate,
} from './events';

/** How far a seek may land from its target and still count as that seek. */
const SEEK_EPSILON = 0.5;

/**
 * A `<track>` on the media element: subtitles and captions, plus the two the
 * skin reads for itself — `kind="chapters"` divides the time slider, and
 * `kind="metadata" label="thumbnails"` drives the hover previews.
 */
export interface VideoTextTrack {
  src: string;
  kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  /** BCP-47 code. The spec requires one on subtitles and captions. */
  srclang?: string;
  label?: string;
  default?: boolean;
}

/**
 * The Video.js 10 default video skin as a standalone Angular component.
 *
 * ```html
 * <ngx-video-player
 *   src="https://stream.mux.com/BV3.../highest.mp4"
 *   poster="https://image.mux.com/BV3.../thumbnail.webp"
 *   [tracks]="[{ src: '/captions/en.vtt', srclang: 'en', label: 'English', default: true }]"
 * />
 * ```
 *
 * `<video-player>` is `display: contents` and `<video-skin>` is a full-width
 * grid, so size the player by styling this host element.
 */
@Component({
  selector: 'ngx-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgTemplateOutlet, NgxVideoSkin],
  template: `
    <media-i18n [attr.lang]="lang() || null">
      @if (skin() === 'custom') {
        <video-player #player>
          <ngx-video-skin [controls]="controls()" [poster]="poster()" [posterAlt]="posterAlt()">
            <ng-container [ngTemplateOutlet]="mediaBody" />
          </ngx-video-skin>
        </video-player>
      } @else if (skin() === 'live') {
        <live-video-player #player>
          <live-video-skin [attr.placeholdersrc]="placeholder() || null">
            <ng-container [ngTemplateOutlet]="mediaBody" />
          </live-video-skin>
        </live-video-player>
      } @else {
        <video-player #player>
          <video-skin [attr.placeholdersrc]="placeholder() || null">
            <ng-container [ngTemplateOutlet]="mediaBody" />
          </video-skin>
        </video-player>
      }
    </media-i18n>

    <ng-template #mediaBody>
      <!--
        The custom media elements take attributes, never properties: their
        definitions load after Angular has already rendered, and a property set
        on a not-yet-upgraded element shadows the accessor it later defines.
        Native <video> has no such window, and its muted content attribute only
        seeds defaultMuted, so that one is a property bind.
      -->
      @switch (resolvedProvider()) {
        @case ('hls') {
          <hlsjs-video
            #media
            playsinline
            [attr.src]="src()"
            [attr.muted]="flag(muted())"
            [attr.preload]="preload()"
            [attr.crossorigin]="crossOrigin() || null"
            [attr.stream-type]="streamType() || null"
            [attr.autoplay]="flag(autoplay())"
            [attr.loop]="flag(loop())"
            [attr.disablepictureinpicture]="flag(disablePictureInPicture())"
            [attr.disableremoteplayback]="flag(disableRemotePlayback())"
          >
            <ng-container [ngTemplateOutlet]="trackList" />
          </hlsjs-video>
        }
        @case ('dash') {
          <dash-video
            #media
            playsinline
            [attr.src]="src()"
            [attr.muted]="flag(muted())"
            [attr.preload]="preload()"
            [attr.crossorigin]="crossOrigin() || null"
            [attr.stream-type]="streamType() || null"
            [attr.autoplay]="flag(autoplay())"
            [attr.loop]="flag(loop())"
            [attr.disablepictureinpicture]="flag(disablePictureInPicture())"
            [attr.disableremoteplayback]="flag(disableRemotePlayback())"
          >
            <ng-container [ngTemplateOutlet]="trackList" />
          </dash-video>
        }
        <!-- Embeds render an <iframe>; <track> children have nothing to attach to. -->
        @case ('youtube') {
          <youtube-video
            #media
            playsinline
            [attr.src]="src()"
            [attr.muted]="flag(muted())"
            [attr.autoplay]="flag(autoplay())"
            [attr.loop]="flag(loop())"
            [attr.disablepictureinpicture]="flag(disablePictureInPicture())"
            [attr.disableremoteplayback]="flag(disableRemotePlayback())"
          ></youtube-video>
        }
        @case ('vimeo') {
          <vimeo-video
            #media
            playsinline
            [attr.src]="src()"
            [attr.muted]="flag(muted())"
            [attr.autoplay]="flag(autoplay())"
            [attr.loop]="flag(loop())"
            [attr.disablepictureinpicture]="flag(disablePictureInPicture())"
            [attr.disableremoteplayback]="flag(disableRemotePlayback())"
          ></vimeo-video>
        }
        @default {
          <video
            #media
            playsinline
            [src]="src()"
            [muted]="muted()"
            [attr.preload]="preload()"
            [attr.crossorigin]="crossOrigin() || null"
            [attr.autoplay]="flag(autoplay())"
            [attr.loop]="flag(loop())"
            [attr.disablepictureinpicture]="flag(disablePictureInPicture())"
            [attr.disableremoteplayback]="flag(disableRemotePlayback())"
          >
            <ng-container [ngTemplateOutlet]="trackList" />
          </video>
        }
      }

      @if (skin() !== 'custom' && poster()) {
        <img slot="poster" [src]="poster()" [alt]="posterAlt()" />
      }

      <!--
        Anything else Video.js accepts beside the media: extra <media-hotkey>
        and <media-gesture> bindings, <google-cast>, <mux-data>. Register the
        element yourself; the player context reaches it from here.
      -->
      <ng-content />
    </ng-template>

    <ng-template #trackList>
      @for (track of tracks(); track track.src + track.srclang) {
        <track
          [attr.src]="track.src"
          [attr.kind]="track.kind ?? 'subtitles'"
          [attr.srclang]="track.srclang || null"
          [attr.label]="track.label || null"
          [attr.default]="flag(track.default)"
        />
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NgxVideoPlayer {
  readonly src = input.required<string>();
  /** Which media element plays it. `'auto'` reads the URL — see `detectProvider`. */
  readonly provider = input<VideoProviderInput>('auto');
  /**
   * Which packaged skin renders the UI. `'live'` is a different element pair —
   * a LIVE pill that turns red at the edge and a DVR window on the time slider,
   * where the on-demand skin shows a duration. Pair it with `streamType`.
   */
  readonly skin = input<VideoSkin>('video');
  /**
   * Which parts of the skin are rendered, each as a real `@if` rather than a
   * CSS rule. Only `skin="custom"` reads it — the packaged skins keep their UI
   * in a shadow root and expose no switches.
   */
  readonly controls = input<VideoControls>({});
  /** Subtitle, caption, chapter and thumbnail tracks. Ignored by YouTube and Vimeo. */
  readonly tracks = input<readonly VideoTextTrack[]>([]);
  readonly poster = input('');
  /** Alt text for the poster — leave empty when the poster is decorative. */
  readonly posterAlt = input('');
  /** Low-resolution image blurred behind the poster while it loads. */
  readonly placeholder = input('');
  /**
   * BCP-47 code for the control labels — see `LOCALES` in `@videojs/html/i18n`
   * for the 51 that ship. Empty follows the nearest `lang` attribute, so a page
   * that sets `<html lang>` needs nothing here. The pack loads on demand.
   */
  readonly lang = input('');
  /**
   * Tells the player the media is live rather than letting it infer, which an
   * endless HLS manifest already reports on its own. Only the `'live'` skin
   * renders live controls for it. Ignored by native `<video>`.
   */
  readonly streamType = input<'' | 'on-demand' | 'live'>('');
  readonly preload = input<'none' | 'metadata' | 'auto'>('metadata');
  /** Cross-origin `<track>` files need `'anonymous'` here, or they never load. */
  readonly crossOrigin = input<'' | 'anonymous' | 'use-credentials'>('');
  readonly autoplay = input(false, { transform: booleanAttribute });
  readonly muted = input(false, { transform: booleanAttribute });
  readonly loop = input(false, { transform: booleanAttribute });
  /**
   * Removes the AirPlay and Cast controls: the availability watch rejects, the
   * buttons report `unsupported` and the skin hides them. Read when the media
   * element attaches, so it needs to be set before the player mounts.
   */
  readonly disableRemotePlayback = input(false, { transform: booleanAttribute });
  /**
   * The standard media attribute — it blocks the browser's own automatic
   * picture-in-picture and its context-menu entry. It does *not* remove the
   * skin's PiP button: 10.5.0 still derives that button's availability from
   * the browser's capability alone, so the button stays and throws if pressed.
   */
  readonly disablePictureInPicture = input(false, { transform: booleanAttribute });

  /**
   * Refuses seeks the viewer makes from *anywhere* — the skin, the browser's
   * own media controls, the Media Session keys, a PiP window, or
   * `video.currentTime = …` in the console — and snaps playback back. Hiding
   * the seek bar removes the affordance; this removes the ability.
   * `seek()` on this component is trusted and always gets through.
   */
  readonly seekGuard = input<VideoSeekGuard>('off');
  /**
   * With `seekGuard="forward"`: how far in, in seconds, the viewer has already
   * watched, so they may seek anywhere up to it. Restore it from your own
   * progress records when the viewer comes back. Playing past it raises it.
   */
  readonly watchedUntil = input(0, { transform: numberAttribute });
  /** Pauses playback whenever the tab is hidden — switched away, minimised, screen locked. */
  readonly pauseWhenHidden = input(false, { transform: booleanAttribute });

  /** The media's `timeupdate`: roughly four times a second while playing, and after every seek. */
  readonly timeUpdate = output<VideoTimeUpdate>();
  /** Duration and dimensions are known. Fires again when `src` changes. */
  readonly metadataLoaded = output<VideoMetadata>();
  /** Playback actually started or resumed — after buffering, not on the click. */
  readonly playing = output<void>();
  /** Playback paused. Not emitted for the pause that comes with reaching the end — see `ended`. */
  readonly paused = output<void>();
  readonly ended = output<void>();
  /** `seekGuard` refused a seek. */
  readonly seekBlocked = output<VideoSeekBlocked>();
  /** The media element is upgraded and listening. Methods called before this wait for it. */
  readonly ready = output<VideoMedia>();

  /** What `provider` resolved to. Also what the template switches on. */
  readonly resolvedProvider = computed<VideoProvider>(() => {
    const requested = this.provider();
    return requested === 'auto' ? detectProvider(this.src()) : requested;
  });

  private readonly document = inject(DOCUMENT);
  private readonly mediaRef = viewChild<ElementRef<HTMLElement>>('media');
  private readonly playerRef = viewChild<ElementRef<HTMLElement>>('player');

  private readonly mediaElement = signal<VideoMedia | null>(null);
  private readonly playerStore = signal<VideoPlayerStore | null>(null);

  /**
   * The upgraded media element, once it is listening; `null` before that, on
   * the server, and while a provider switch swaps the element.
   */
  readonly media = this.mediaElement.asReadonly();
  /** The `<video-player>` store, once its definition has loaded. See `VideoPlayerStore`. */
  readonly store = this.playerStore.asReadonly();

  private mediaWaiters: ((media: VideoMedia) => void)[] = [];
  private storeWaiters: ((store: VideoPlayerStore) => void)[] = [];

  // Seek guard state. `position` is the last position the guard accepted;
  // `furthest` is the furthest point reached by playing rather than seeking.
  private position = 0;
  private furthest = 0;
  /** A seek this component made itself — the guard lets it through. */
  private trustedSeek: number | null = null;
  /** The seek the guard made to undo one — not a fresh attempt. */
  private restoringTo: number | null = null;

  constructor() {
    // No-ops without `customElements`, so this is safe during server rendering.
    effect(() => void loadVideoJsElements(this.resolvedProvider(), this.skin()));

    effect((onCleanup) => {
      const element = this.mediaRef()?.nativeElement;
      if (!element || typeof customElements === 'undefined') return;

      const controller = new AbortController();
      onCleanup(() => {
        controller.abort();
        this.mediaElement.set(null);
      });

      // The custom media elements only forward events to listeners added after
      // they upgrade, so wait for the definition before listening.
      upgraded(element).then(() => {
        if (!controller.signal.aborted) this.attach(element as VideoMedia, controller.signal);
      });
    });

    effect((onCleanup) => {
      const element = this.playerRef()?.nativeElement;
      if (!element || typeof customElements === 'undefined') return;

      let current = true;
      onCleanup(() => {
        current = false;
        this.playerStore.set(null);
      });

      upgraded(element).then(() => {
        const store = (element as Partial<{ store: VideoPlayerStore }>).store;
        if (!current || !store) return;
        this.playerStore.set(store);
        this.flush('store', store);
      });
    });

    // Raising the floor applies at once; it never lowers what was watched.
    effect(() => {
      const watched = this.watchedUntil();
      untracked(() => (this.furthest = Math.max(this.furthest, watched || 0)));
    });
  }

  /** Resolves with the media element once it is upgraded and listening. */
  whenReady(): Promise<VideoMedia> {
    const media = this.mediaElement();
    return media
      ? Promise.resolve(media)
      : new Promise((resolve) => this.mediaWaiters.push(resolve));
  }

  /** Rejects when the browser blocks it — autoplay with sound, mostly. */
  async play(): Promise<void> {
    const media = await this.whenReady();
    await media.play();
  }

  async pause(): Promise<void> {
    (await this.whenReady()).pause();
  }

  async togglePlay(): Promise<void> {
    const media = await this.whenReady();
    if (media.paused || media.ended) await media.play();
    else media.pause();
  }

  /**
   * Seeks to `time` seconds and resolves with where playback landed, once the
   * seek completes. Waits for metadata if it has not loaded yet, so calling it
   * straight after `src` changes resumes at the right place. Clamped to the
   * duration. Bypasses `seekGuard`, and under `"forward"` marks everything up
   * to `time` as watched.
   */
  async seek(time: number): Promise<number> {
    const media = await this.whenReady();
    this.trustedSeek = Math.max(0, time);
    const store = this.playerStore();
    if (store) return store.seek(time);

    media.currentTime = this.trustedSeek;
    return media.currentTime;
  }

  /**
   * Fullscreens the whole player — controls and captions included — not the
   * bare media. Browsers only allow it from a click or key press.
   */
  async requestFullscreen(): Promise<void> {
    await (await this.whenStore()).requestFullscreen();
  }

  async exitFullscreen(): Promise<void> {
    await (await this.whenStore()).exitFullscreen();
  }

  async toggleFullscreen(): Promise<void> {
    const store = await this.whenStore();
    await (store.state.isFullscreen ? store.exitFullscreen() : store.requestFullscreen());
  }

  /** Boolean content attributes are present-or-absent, not `"true"`/`"false"`. */
  protected flag(on: boolean | undefined): '' | null {
    return on ? '' : null;
  }

  private whenStore(): Promise<VideoPlayerStore> {
    const store = this.playerStore();
    return store
      ? Promise.resolve(store)
      : new Promise((resolve) => this.storeWaiters.push(resolve));
  }

  private flush(kind: 'media', value: VideoMedia): void;
  private flush(kind: 'store', value: VideoPlayerStore): void;
  private flush(kind: 'media' | 'store', value: VideoMedia | VideoPlayerStore): void {
    const waiters = kind === 'media' ? this.mediaWaiters : this.storeWaiters;
    if (kind === 'media') this.mediaWaiters = [];
    else this.storeWaiters = [];
    for (const resolve of waiters) (resolve as (v: typeof value) => void)(value);
  }

  private attach(media: VideoMedia, signal: AbortSignal): void {
    const on = (target: EventTarget, type: string, listener: () => void) =>
      target.addEventListener(type, listener, { signal });

    this.resetGuard(media);

    on(media, 'emptied', () => this.resetGuard(media));
    on(media, 'seeking', () => this.guard(media, true));
    on(media, 'seeked', () => {
      this.trustedSeek = null;
      this.restoringTo = null;
    });
    on(media, 'timeupdate', () => {
      this.guard(media, false);
      this.timeUpdate.emit({ currentTime: media.currentTime, duration: media.duration });
    });
    on(media, 'loadedmetadata', () => this.metadataLoaded.emit(metadataOf(media)));
    on(media, 'playing', () => this.playing.emit());
    // Reaching the end pauses the media too; that one is reported as `ended`.
    on(media, 'pause', () => !media.ended && this.paused.emit());
    on(media, 'ended', () => this.ended.emit());
    on(this.document, 'visibilitychange', () => {
      if (this.pauseWhenHidden() && this.document.hidden && !media.paused) media.pause();
    });

    this.mediaElement.set(media);
    this.flush('media', media);
    this.ready.emit(media);

    // A native <video> can get ahead of the listeners; replay what was missed.
    if ((media.readyState ?? 0) >= 1) this.metadataLoaded.emit(metadataOf(media));
    if (!media.paused && (media.readyState ?? 0) >= 3) this.playing.emit();
  }

  private resetGuard(media: VideoMedia): void {
    this.position = media.currentTime || 0;
    this.furthest = Math.max(this.position, this.watchedUntil() || 0);
    // `trustedSeek` survives: `seek()` straight after a `src` change lands
    // after this reset, once the new metadata loads.
    this.restoringTo = null;
  }

  /**
   * Runs on every `seeking` and `timeupdate`. A jump that never raised
   * `seeking` — some embeds do not — still shows up here as a gap between two
   * time updates larger than playback could have covered.
   */
  private guard(media: VideoMedia, seeking: boolean): void {
    const time = media.currentTime;
    if (!Number.isFinite(time)) return;

    const duration = Number.isFinite(media.duration) ? media.duration : Infinity;
    const near = (target: number | null) =>
      target !== null && Math.abs(time - Math.min(target, duration)) <= SEEK_EPSILON;

    if (near(this.trustedSeek)) {
      this.position = time;
      this.furthest = Math.max(this.furthest, time);
      return;
    }
    if (near(this.restoringTo)) {
      this.position = time;
      return;
    }

    // Timeupdates fire about every 250 ms; leave generous room for a busy main
    // thread and for faster playback rates.
    const step = 1.5 * Math.max(1, media.playbackRate || 1);
    const played = !seeking && time >= this.position && time - this.position <= step;
    const mode = this.seekGuard();

    let allowed: boolean;
    if (mode === 'off' || played) {
      allowed = true;
    } else if (mode === 'forward') {
      allowed = time <= this.furthest + SEEK_EPSILON;
    } else {
      // Back to the start from the end is a replay or a loop, not a skip.
      const restart = time <= SEEK_EPSILON && this.position >= duration - step;
      allowed = Math.abs(time - this.position) <= SEEK_EPSILON || restart;
    }

    if (allowed) {
      this.position = time;
      if (played) this.furthest = Math.max(this.furthest, time);
      return;
    }

    const restored = this.position;
    this.restoringTo = restored;
    media.currentTime = restored;
    this.seekBlocked.emit({ attempted: time, restored });
  }
}

/** Resolves once a custom element's definition has loaded; at once for native tags. */
function upgraded(element: HTMLElement): Promise<unknown> {
  const tag = element.localName;
  return tag.includes('-') ? customElements.whenDefined(tag) : Promise.resolve();
}

function metadataOf(media: VideoMedia): VideoMetadata {
  return {
    duration: media.duration,
    videoWidth: media.videoWidth ?? 0,
    videoHeight: media.videoHeight ?? 0,
  };
}
