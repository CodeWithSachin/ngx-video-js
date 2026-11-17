# ngx-video-js

Angular wrapper for the [Video.js 10](https://videojs.org) web components, published as
[`@code_with_sachin/ngx-video-js`](https://www.npmjs.com/package/@code_with_sachin/ngx-video-js).

**Usage docs:** [projects/ngx-video-js/README.md](projects/ngx-video-js/README.md) ·
**Live demo:** https://sachinsingh.me/packages/video ·
**Changes:** [CHANGELOG](projects/ngx-video-js/CHANGELOG.md)

```bash
npm i @code_with_sachin/ngx-video-js @videojs/html
```

## Development

This is an Angular workspace with one library project.

```bash
npm ci
npm test          # Vitest + jsdom
npm run build     # ng-packagr → dist/ngx-video-js
npm run pack      # build, then a tarball to try in another app
```

The `skin="custom"` stylesheet in `src/lib/video-skin.component.css` is vendored
verbatim from `@videojs/html/video/skin.css`, and the template beside it is ejected
from the same version's default skin. When moving the `@videojs/html` peer range,
re-copy the stylesheet, diff the template against upstream, and keep local CSS in
`video-skin.overrides.css`.

## Releasing

1. Bump `version` in `projects/ngx-video-js/package.json` and add a CHANGELOG entry.
2. `npm run release` — builds, runs the tests, and publishes `dist/ngx-video-js`.
   npm asks for a two-factor confirmation in the browser.
3. Tag the commit: `git tag v<version> && git push --tags`.

## Licence

MIT © [Sachin Singh](https://sachinsingh.me)
