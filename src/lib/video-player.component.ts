import { NgTemplateOutlet } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  effect,
  input,
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
        <video-player>
          <ngx-video-skin [controls]="controls()" [poster]="poster()" [posterAlt]="posterAlt()">
            <ng-container [ngTemplateOutlet]="mediaBody" />
          </ngx-video-skin>
        </video-player>
      } @else if (skin() === 'live') {
        <live-video-player>
          <live-video-skin [attr.placeholdersrc]="placeholder() || null">
            <ng-container [ngTemplateOutlet]="mediaBody" />
          </live-video-skin>
        </live-video-player>
      } @else {
        <video-player>
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
   * skin's PiP button: 10.0.0-beta.27 derives that button's availability from
   * the browser's capability alone, so the button stays and throws if pressed.
   */
  readonly disablePictureInPicture = input(false, { transform: booleanAttribute });

  /** What `provider` resolved to. Also what the template switches on. */
  readonly resolvedProvider = computed<VideoProvider>(() => {
    const requested = this.provider();
    return requested === 'auto' ? detectProvider(this.src()) : requested;
  });

  constructor() {
    // No-ops without `customElements`, so this is safe during server rendering.
    effect(() => void loadVideoJsElements(this.resolvedProvider(), this.skin()));
  }

  /** Boolean content attributes are present-or-absent, not `"true"`/`"false"`. */
  protected flag(on: boolean | undefined): '' | null {
    return on ? '' : null;
  }
}
