# Changelog

## 0.2.1

- The package now lives in its own repository,
  [CodeWithSachin/ngx-video-js](https://github.com/CodeWithSachin/ngx-video-js).
  The `repository` and `bugs` links point there.
- Ships a `LICENSE` file.
- No code changes from 0.2.0.

## 0.2.0

### Added

- **Outputs**: `timeUpdate`, `metadataLoaded`, `playing`, `paused`, `ended`,
  `seekBlocked` and `ready`. They re-emit the media element's own events, so they
  behave the same for MP4, HLS, DASH, YouTube and Vimeo.
- **Methods**: `play()`, `pause()`, `togglePlay()`, `seek()`,
  `requestFullscreen()`, `exitFullscreen()`, `toggleFullscreen()` and
  `whenReady()`. Each waits for the media element, so they are safe to call
  straight after render.
- **Handles**: `media()` (the media element) and `store()` (the `<video-player>`
  store) signals, for everything the methods do not cover.
- **`seekGuard`** (`'off' | 'forward' | 'all'`) and **`watchedUntil`**: refuse
  seeks from anywhere — the browser's controls, Media Session, PiP, the console —
  and snap playback back.
- **`pauseWhenHidden`**: pause when the tab is hidden.
- `VideoControls.seekButtons` and `VideoControls.title` for the two new parts of
  the 10.5.0 skin.

### Changed

- **Requires `@videojs/html` `^10.5.0`** (was `^10.0.0-beta.27`).
- The HLS, DASH, YouTube and Vimeo engines are now separate Video.js packages
  (`@videojs/hlsjs-video`, `@videojs/dash-video`, `@videojs/youtube-video`,
  `@videojs/vimeo-video`), declared as peers. npm and pnpm install them
  automatically; Yarn users add them by hand.
- `skin="custom"` is re-ejected from the 10.5.0 default skin: new layout, a
  centre play button with ±10 s seek buttons, the media title, and the upstream
  stylesheet vendored verbatim. `progressBar: false` removes the ±10 s buttons
  along with every other seeking affordance.
- Tooltip and menu ids are unique per player, so several custom-skin players can
  share a page.

### Fixed

- `skin="custom"` now defines `<video-player>` itself. From 10.5.0
  `@videojs/html/video/ui` no longer does, so a page with only custom-skin
  players would have had no working controls.
- The player element is defined before the UI and media elements, which removes
  a burst of "requires … feature" console warnings on load.

## 0.1.1

- Initial public release.
