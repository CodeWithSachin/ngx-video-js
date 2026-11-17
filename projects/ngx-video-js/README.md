# @code_with_sachin/ngx-video-js

Angular wrapper for the [Video.js 10](https://videojs.org) web components — the full
default video skin in one standalone component, SSR-safe and lazily loaded.

**[Live demo & docs → https://sachinsingh.me/packages/video](https://sachinsingh.me/packages/video)**

Video.js 10 ships its player as custom elements: `<video-player>` holds the state,
`<video-skin>` is the packaged UI, and a plain `<video>` handles the media. Those
elements are framework-agnostic and already do everything — controls, menus,
hotkeys, gestures, indicators, thumbnails, Cast/AirPlay/PiP. This package is the
thin Angular layer over them: inputs instead of attributes, no custom element
registration on the server, and no stylesheet to remember to import.

- SSR-safe by construction — the element definitions load inside `afterNextRender`.
- Skin CSS travels inside the skin's shadow root, so nothing leaks into your app.
- Definitions are registered once per document, no matter how many players render.
- Standalone component, signal inputs, zoneless-friendly.
- Playback events, an imperative API (`play()`, `seek()`, fullscreen…) and a hard seek guard.

## Install

```bash
npm i @code_with_sachin/ngx-video-js @videojs/html
```

Peer dependencies: Angular 22+ and `@videojs/html` 10.5+. Since 10.5.0 the HLS,
DASH, YouTube and Vimeo engines ship as separate packages; they are peers of this
one, so npm and pnpm install them for you. With Yarn, add them yourself:

```bash
yarn add @videojs/hlsjs-video @videojs/dash-video @videojs/youtube-video @videojs/vimeo-video
```

Each one is a lazy chunk — a page that only plays MP4 never downloads hls.js.

## Usage

```ts
import { Component } from '@angular/core';
import { NgxVideoPlayer } from '@code_with_sachin/ngx-video-js';

@Component({
  selector: 'app-talk',
  imports: [NgxVideoPlayer],
  template: `
    <ngx-video-player
      src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
      poster="https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.webp"
      posterAlt="Cyclist riding past a warehouse"
    />
  `,
  styles: `
    ngx-video-player {
      max-width: 60rem;
    }
  `,
})
export class Talk {}
```

## Inputs

| Input             | Type                                                           | Default      | Notes                                                                                                 |
| ----------------- | -------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| `src`             | `string`                                                       | **required** | MP4/WebM, an HLS `.m3u8`, a DASH `.mpd`, or a YouTube or Vimeo link — see `provider`.                 |
| `provider`        | `'auto' \| 'video' \| 'hls' \| 'dash' \| 'youtube' \| 'vimeo'` | `'auto'`     | `'auto'` picks the media element from the URL: host for embeds, extension for manifests.              |
| `skin`            | `'video' \| 'live' \| 'custom'`                                | `'video'`    | See [Live](#live) and [Removing controls](#removing-controls).                                        |
| `controls`        | `VideoControls`                                                | `{}`         | `skin="custom"` only. Which parts render.                                                             |
| `tracks`          | `VideoTextTrack[]`                                             | `[]`         | Subtitles, captions, chapters and thumbnail tracks.                                                   |
| `poster`          | `string`                                                       | `''`         | Rendered as an `<img>` in the skin's poster slot — `srcset` and friends work because you own the tag. |
| `posterAlt`       | `string`                                                       | `''`         | Leave empty when the poster is decorative.                                                            |
| `placeholder`     | `string`                                                       | `''`         | Tiny image blurred behind the poster while it loads (`placeholdersrc`).                               |
| `preload`         | `'none' \| 'metadata' \| 'auto'`                               | `'metadata'` |                                                                                                       |
| `crossOrigin`     | `'' \| 'anonymous' \| 'use-credentials'`                       | `''`         | Needed for cross-origin text tracks.                                                                  |
| `autoplay`        | `boolean`                                                      | `false`      | Browsers require `muted` alongside it.                                                                |
| `muted`           | `boolean`                                                      | `false`      |                                                                                                       |
| `loop`            | `boolean`                                                      | `false`      |                                                                                                       |
| `seekGuard`       | `'off' \| 'forward' \| 'all'`                                  | `'off'`      | See [Locking down seeking](#locking-down-seeking).                                                    |
| `watchedUntil`    | `number`                                                       | `0`          | Seconds already watched, for `seekGuard="forward"`.                                                   |
| `pauseWhenHidden` | `boolean`                                                      | `false`      | Pauses when the tab is hidden.                                                                        |

`playsinline` is always set — without it iOS Safari takes the video fullscreen on play.

## Events

Every output re-emits the media element's own event, so the cadence and
semantics are the browser's — and identical across MP4, HLS, DASH, YouTube and
Vimeo.

```html
<ngx-video-player
  src="/media/lesson.m3u8"
  (metadataLoaded)="duration = $event.duration"
  (timeUpdate)="progress.save($event.currentTime)"
  (playing)="analytics.track('play')"
  (paused)="analytics.track('pause')"
  (ended)="markComplete()"
/>
```

| Output           | Payload                                 | When                                                                                |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `ready`          | `VideoMedia`                            | The media element is upgraded and listening.                                        |
| `metadataLoaded` | `{ duration, videoWidth, videoHeight }` | Duration and dimensions are known. Again on every `src` change.                     |
| `timeUpdate`     | `{ currentTime, duration }`             | About four times a second while playing, and after each seek.                       |
| `playing`        | —                                       | Playback actually started — after buffering, so also after a seek or a stall.       |
| `paused`         | —                                       | Playback paused. The pause that comes with reaching the end is reported as `ended`. |
| `ended`          | —                                       | Reached the end (never fires with `loop`).                                          |
| `seekBlocked`    | `{ attempted, restored }`               | `seekGuard` refused a seek and put playback back.                                   |

## Controlling playback from code

Grab the component with `viewChild` and call it. Every method waits for the
media element if it has not loaded yet, so calling one straight after render is
fine.

```ts
import { Component, viewChild } from '@angular/core';
import { NgxVideoPlayer } from '@code_with_sachin/ngx-video-js';

@Component({
  imports: [NgxVideoPlayer],
  template: `
    <ngx-video-player #player src="/media/lesson.mp4" />
    <button (click)="player.togglePlay()">Play / pause</button>
    <button (click)="player.toggleFullscreen()">Fullscreen</button>
  `,
})
export class Lesson {
  readonly player = viewChild.required(NgxVideoPlayer);

  resume(seconds: number) {
    return this.player().seek(seconds); // resolves with where playback landed
  }
}
```

| Method                                                          | Notes                                                                                               |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `play()`                                                        | Rejects when the browser blocks it — unmuted autoplay, mostly.                                      |
| `pause()`, `togglePlay()`                                       |                                                                                                     |
| `seek(seconds)`                                                 | Waits for metadata, clamps to the duration, resolves once the seek completes. Bypasses `seekGuard`. |
| `requestFullscreen()`, `exitFullscreen()`, `toggleFullscreen()` | The whole player, controls and captions included. Browsers require a click or key press.            |
| `whenReady()`                                                   | Resolves with the media element.                                                                    |

For anything else there are two handles, both signals and both `null` until
loaded (and always on the server):

- `media()` — the media element: a native `<video>` or a Video.js media element,
  all with the `HTMLMediaElement` playback surface (`currentTime`, `volume`,
  `playbackRate`, …).
- `store()` — the `<video-player>` store every built-in control acts through:
  `store().state` for volume, captions, quality, PiP and the rest, and
  `store().subscribe()` to follow changes.

## Locking down seeking

For compliance and course content, where the viewer has to watch rather than
skip:

```ts
@Component({
  imports: [NgxVideoPlayer],
  template: `
    <ngx-video-player
      skin="custom"
      [src]="lesson.src"
      [controls]="{ progressBar: false, speedMenu: false }"
      seekGuard="forward"
      [watchedUntil]="lesson.watchedSeconds"
      pauseWhenHidden
      (timeUpdate)="save($event.currentTime)"
      (ended)="complete()"
    />
  `,
})
export class Lesson {}
```

Three layers, each closing what the one before leaves open:

1. **`progressBar: false`** removes every seeking affordance from the skin — the
   seek bar, the ±10 s buttons, arrow keys, `j`/`l`, `0`–`9`, `Home`/`End`,
   double-tap and the seek indicator. **`speedMenu: false`** removes the speed
   menu and `<`/`>`. Applied live, without remounting.
2. **`seekGuard`** stops seeks from outside the skin: the browser's own media
   controls, Media Session keys, a picture-in-picture window, or
   `video.currentTime = …` in the console. It snaps playback back to where it
   was and emits `seekBlocked`. `'forward'` still lets the viewer rewind, and
   seek forward up to the furthest point they have played to (or
   `watchedUntil`, if that is further); `'all'` refuses every seek but replays
   and loops. A jump that never raised a `seeking` event still shows up as a gap
   between time updates and is undone the same way.
3. **`pauseWhenHidden`** pauses the moment the tab is hidden, so the video cannot
   play to the end in a background tab.

`seek()` on the component is trusted, so resuming from your own records works
under any guard. Playback rate is not policed: someone who changes
`playbackRate` from the console is still watching every frame, only faster.

## Language

51 locale packs ship with `@videojs/html`, and only the one in use is fetched.
Every label, tooltip, menu entry and screen-reader announcement follows.

```html
<ngx-video-player lang="hi" src="/media/talk.mp4" />

<!-- Leave it empty and the player follows the nearest lang attribute, so a
     site that already sets <html lang> needs nothing here. -->
<ngx-video-player src="/media/talk.mp4" />
```

## Live

The live controls are a **separate packaged skin** — `<live-video-player>` and
`<live-video-skin>` — not a mode of the on-demand one, whose template has no
live controls at all. `skin="live"` swaps the pair and keeps the media, the
tracks and anything projected into it.

```html
<!-- A LIVE pill that turns red at the edge where the duration would be,
     and a DVR window on the time slider. -->
<ngx-video-player skin="live" src="https://cdn.example.com/live.m3u8" />
```

An endless manifest already reports itself as live, so `streamType` is only for
media that cannot say so — a proxy reporting a finite duration, a recording
played as live.

## Removing controls

### With the custom skin

`skin="custom"` renders the default video skin ejected into this package's own
Angular template, in light DOM, with every part behind an `@if`. A part you
switch off is not in the document — there is no CSS rule for a viewer to
override in devtools and no hidden button to re-enable.

```ts
import { NgxVideoPlayer, type VideoControls } from '@code_with_sachin/ngx-video-js';

@Component({
  imports: [NgxVideoPlayer],
  template: `<ngx-video-player skin="custom" [controls]="controls" src="/media/module-3.mp4" />`,
})
export class Lesson {
  readonly controls: VideoControls = {
    progressBar: false,
    settingsMenu: false,
    pipButton: false,
    fullscreenButton: false,
  };
}
```

**Removing a control removes its shortcuts too.** Drop `progressBar` and the
±10 s buttons, arrow keys, `j`/`l`, `Home`/`End`, `0`–`9`, the double-tap seek
and the seek indicator all go with it — otherwise the restriction would be
decoration. To stop seeks from outside the skin too, add
[`seekGuard`](#locking-down-seeking). The
same applies to submenus: closing `settingsMenu` takes `<`/`>` with it, because
a shortcut whose control is unreachable is a way back in.

| Group     | Keys                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layers    | `poster`, `bufferingIndicator`, `errorDialog`, `overlay`, `title`                                                                                                        |
| Primary   | `controlBar`, `playButton`, `seekButtons`, `muteButton`, `volumeSlider`, `currentTime`, `progressBar`, `chapters`, `thumbnailPreview`, `remainingTime`, `captionsButton` |
| Menu      | `settingsMenu`, `qualityMenu`, `audioMenu`, `speedMenu`, `captionsMenu`                                                                                                  |
| Top right | `castButton`, `airplayButton`, `pipButton`, `fullscreenButton`                                                                                                           |
| Input     | `hotkeys`, `gestures`, `tooltips`, `statusAnnouncer`, `volumeIndicator`, `statusIndicator`, `seekIndicator`                                                              |

Every key defaults to `true`. Containers collapse on their own: turn off all
four top-right buttons and their cluster goes; turn off every submenu and the
settings trigger goes with them. Changes apply live — it is an Angular template,
not a custom element, so nothing remounts.

Two costs, both worth knowing before you switch: the skin's stylesheet travels
with the component rather than inside a shadow root, which is about 12 kB
gzipped in whichever chunk imports the player, and you no longer pick up
upstream design updates by bumping the version.

### With the packaged skins

They have no per-button switches, and mostly do not need them: each control asks
the media whether it can do the thing and hides itself when the answer is no.
That is why the quality and audio menus are absent on a progressive MP4, and why
AirPlay never appears outside Safari. The lever you hold is telling the media it
cannot.

```html
<ngx-video-player disableRemotePlayback src="/media/talk.mp4" />
```

`disableRemotePlayback` genuinely removes AirPlay and Cast — the availability
watch rejects and both buttons go `unsupported`. `disablePictureInPicture` does
**not** currently do the same for PiP: 10.5.0 still derives that button's
availability from the browser's capability alone, so the attribute stops the
browser's own auto-PiP but leaves the skin's button in place, throwing if
pressed. Both are read when the media element attaches, so set them before the
player mounts.

## Anything else

The skin's own hotkeys and gestures are fixed — space, `k`, `m`, `f`, `c`, `i`,
`j`/`l`, arrows, `0`–`9`, `<`/`>`, plus tap and double-tap. What you can do is
add more, and add the sibling components Video.js expects, by projecting them as
children. They are not inputs here because there is nothing to wrap: they are
elements, and the player context already reaches them.

```html
<ngx-video-player src="/media/talk.mp4">
  <!-- import '@videojs/html/ui/hotkey' -->
  <media-hotkey keys="n" action="seekStep" value="30"></media-hotkey>
  <media-gesture type="doubletap" action="toggleMuted" region="center"></media-gesture>

  <!-- import '@videojs/html/media/google-cast' and '.../mux-data' -->
  <google-cast></google-cast>
  <mux-data env-key="..."></mux-data>
</ngx-video-player>
```

Bindings are additive — the skin's own are still there, so a second binding on a
key it already uses fires twice. Actions a hotkey or gesture can fire:
`togglePaused`, `toggleMuted`, `toggleFullscreen`, `toggleSubtitles`,
`togglePictureInPicture`, `toggleControls` (gesture only), `seekStep`,
`volumeStep`, `speedUp`, `speedDown`, and `seekToPercent` (hotkey only).

## Sizing

`<video-player>` is `display: contents` and `<video-skin>` is a full-width grid, so
the player takes its size from this component's host element:

```css
ngx-video-player {
  max-width: 60rem;
  aspect-ratio: 16 / 9;
}
```

## Theming

The skin reads CSS custom properties from the host document, so set them on the host:

```css
ngx-video-player {
  --media-accent-color: oklch(0.72 0.19 25); /* slider fill, focus, hover */
  --media-accent-text-color: oklch(1 0 0); /* label colour on those states */
  --media-border-radius: 0.75rem;
  --media-scale-unit: 18px; /* scales the whole control layer */
  --media-object-fit: cover;
  --media-object-position: top;
  --media-poster-placeholder-blur: 24px;
}
```

## Requirements

| Package                                                              | Peer range | Tested  | Notes                                                              |
| -------------------------------------------------------------------- | ---------- | ------- | ------------------------------------------------------------------ |
| `@angular/core`                                                      | `^22.0.0`  | 22.0.5  | Standalone APIs, signal inputs and `afterNextRender`.              |
| `typescript`                                                         | `~6.0.0`   | 6.0.3   | Whatever your Angular version supports.                            |
| `node`                                                               | `>=20`     | 24.15.0 | Build and SSR only.                                                |
| `@videojs/html`                                                      | `^10.5.0`  | 10.5.0  | The custom elements. The custom skin is ejected from this version. |
| `@videojs/hlsjs-video`, `dash-video`, `youtube-video`, `vimeo-video` | `^10.5.0`  | 10.5.0  | Provider engines, loaded only when a source needs them.            |

## SSR

The component renders `<video-player><video-skin><video>` markup on the server and
never touches `customElements`, so prerendering works. The elements upgrade on
hydration; until then the browser shows the poster `<img>`.

The media element is chosen from the URL, so the prerendered HTML already has the
right tag — nothing swaps on hydration.

Loading the definitions ahead of a player — during a route resolve, say — is a
plain call. Name the provider to warm hls.js alongside the skin:

```ts
import { loadVideoJsElements } from '@code_with_sachin/ngx-video-js';

await loadVideoJsElements('hls', 'live'); // memoised per module; no-op without customElements
```

## Going further

This wraps the _packaged_ skin. When you need to restructure the UI rather than
restyle it, eject the skin per the
[Video.js guide](https://videojs.org/docs/framework/html/how-to/customize-skins) and
compose the `media-*` elements directly in your own Angular template — they are
custom elements, so `CUSTOM_ELEMENTS_SCHEMA` is all Angular needs.

## Licence

MIT © [Sachin Singh](https://sachinsingh.me)
