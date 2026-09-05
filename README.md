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

## Install

```bash
npm i @code_with_sachin/ngx-video-js @videojs/html
```

Peer dependencies: Angular 22+, `@videojs/html` 10 (currently beta).

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

| Input         | Type                                     | Default      | Notes                                                                                                 |
| ------------- | ---------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| `src`         | `string`                                 | **required** | Passed to the inner `<video>`. MP4, or HLS where the browser plays it natively.                       |
| `poster`      | `string`                                 | `''`         | Rendered as an `<img>` in the skin's poster slot — `srcset` and friends work because you own the tag. |
| `posterAlt`   | `string`                                 | `''`         | Leave empty when the poster is decorative.                                                            |
| `placeholder` | `string`                                 | `''`         | Tiny image blurred behind the poster while it loads (`placeholdersrc`).                               |
| `preload`     | `'none' \| 'metadata' \| 'auto'`         | `'metadata'` |                                                                                                       |
| `crossOrigin` | `'' \| 'anonymous' \| 'use-credentials'` | `''`         | Needed for cross-origin text tracks.                                                                  |
| `autoplay`    | `boolean`                                | `false`      | Browsers require `muted` alongside it.                                                                |
| `muted`       | `boolean`                                | `false`      |                                                                                                       |
| `loop`        | `boolean`                                | `false`      |                                                                                                       |

`playsinline` is always set — without it iOS Safari takes the video fullscreen on play.

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
arrow keys, `j`/`l`, `Home`/`End`, `0`–`9`, the double-tap seek and the seek
indicator all go with it — otherwise the restriction would be decoration. The
same applies to submenus: closing `settingsMenu` takes `<`/`>` with it, because
a shortcut whose control is unreachable is a way back in.

| Group     | Keys                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layers    | `poster`, `bufferingIndicator`, `errorDialog`, `overlay`                                                                                                  |
| Primary   | `controlBar`, `playButton`, `muteButton`, `volumeSlider`, `currentTime`, `progressBar`, `chapters`, `thumbnailPreview`, `remainingTime`, `captionsButton` |
| Menu      | `settingsMenu`, `qualityMenu`, `audioMenu`, `speedMenu`, `captionsMenu`                                                                                   |
| Secondary | `castButton`, `airplayButton`, `pipButton`, `fullscreenButton`                                                                                            |
| Input     | `hotkeys`, `gestures`, `tooltips`, `statusAnnouncer`, `volumeIndicator`, `statusIndicator`, `seekIndicator`                                               |

Every key defaults to `true`. Containers collapse on their own: turn off all
four buttons in the second row and the row goes; turn off every submenu and the
settings trigger goes with them. Changes apply live — it is an Angular template,
not a custom element, so nothing remounts.

Two costs, both worth knowing before you switch: the skin's stylesheet travels
with the component rather than inside a shadow root, which is about 25 kB
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
**not** currently do the same for PiP: 10.0.0-beta.27 derives that button's
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

| Package         | Peer range        | Tested         | Notes                                                 |
| --------------- | ----------------- | -------------- | ----------------------------------------------------- |
| `@angular/core` | `^22.0.0`         | 22.0.5         | Standalone APIs, signal inputs and `afterNextRender`. |
| `typescript`    | `~6.0.0`          | 6.0.3          | Whatever your Angular version supports.               |
| `node`          | `>=20`            | 24.15.0        | Build and SSR only.                                   |
| `@videojs/html` | `^10.0.0-beta.27` | 10.0.0-beta.27 | The custom elements. Still beta — pin it.             |

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
