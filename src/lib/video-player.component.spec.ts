import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { detectProvider } from './load-elements';
import { NgxVideoPlayer } from './video-player.component';

describe('detectProvider', () => {
  it('reads the host for embeds', () => {
    expect(detectProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(detectProvider('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(detectProvider('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(detectProvider('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('youtube');
    expect(detectProvider('https://vimeo.com/76979871')).toBe('vimeo');
    expect(detectProvider('https://player.vimeo.com/video/76979871')).toBe('vimeo');
  });

  it('reads the manifest extension, ignoring the query string', () => {
    expect(detectProvider('https://example.com/a.m3u8')).toBe('hls');
    expect(detectProvider('https://example.com/a.m3u8?token=abc.mp4')).toBe('hls');
    expect(detectProvider('https://example.com/a.mpd')).toBe('dash');
    expect(detectProvider('https://example.com/a.mp4')).toBe('video');
    expect(detectProvider('/local/clip.mp4')).toBe('video');
  });

  it('does not mistake a lookalike host for the real one', () => {
    expect(detectProvider('https://notyoutube.com/watch?v=x')).toBe('video');
    expect(detectProvider('https://evil.com/youtube.com/x.mp4')).toBe('video');
    expect(detectProvider('')).toBe('video');
  });
});

describe('NgxVideoPlayer', () => {
  let fixture: ComponentFixture<NgxVideoPlayer>;
  let host: HTMLElement;

  const setInputs = async (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxVideoPlayer],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxVideoPlayer);
    fixture.componentRef.setInput('src', 'https://example.com/video.mp4');
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
  });

  it('nests the media inside the skin inside the player', () => {
    const video = host.querySelector('video-player > video-skin > video');
    expect(video).toBeTruthy();
    expect(video?.getAttribute('src')).toBe('https://example.com/video.mp4');
    expect(video?.hasAttribute('playsinline')).toBe(true);
  });

  it('omits optional attributes until they are set', () => {
    const video = host.querySelector('video')!;
    expect(host.querySelector('[slot="poster"]')).toBeNull();
    expect(host.querySelector('video-skin')?.hasAttribute('placeholdersrc')).toBe(false);
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('loop')).toBe(false);
    expect(video.getAttribute('preload')).toBe('metadata');
    expect(host.querySelector('track')).toBeNull();
  });

  it('renders the poster into the skin slot and the blurred placeholder', async () => {
    await setInputs({
      poster: 'https://example.com/poster.webp',
      posterAlt: 'Keynote speaker',
      placeholder: 'data:image/webp;base64,AAAA',
    });

    const poster = host.querySelector<HTMLImageElement>('img[slot="poster"]')!;
    expect(poster.getAttribute('src')).toBe('https://example.com/poster.webp');
    expect(poster.alt).toBe('Keynote speaker');
    expect(host.querySelector('video-skin')?.getAttribute('placeholdersrc')).toBe(
      'data:image/webp;base64,AAAA',
    );
  });

  it('coerces the boolean attribute inputs', async () => {
    await setInputs({ autoplay: '', muted: '', loop: '' });

    const video = host.querySelector<HTMLVideoElement>('video')!;
    expect(video.hasAttribute('autoplay')).toBe(true);
    expect(video.hasAttribute('loop')).toBe(true);
    expect(video.muted).toBe(true);
  });

  it('swaps the media element for the source it is given', async () => {
    await setInputs({ src: 'https://example.com/stream.m3u8' });
    expect(host.querySelector('hlsjs-video')).toBeTruthy();
    expect(host.querySelector('video')).toBeNull();

    await setInputs({ src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(host.querySelector('youtube-video')).toBeTruthy();

    await setInputs({ src: 'https://example.com/manifest.mpd' });
    expect(host.querySelector('dash-video')).toBeTruthy();
  });

  it('lets an explicit provider override the URL', async () => {
    await setInputs({ src: 'https://example.com/no-extension', provider: 'hls' });
    expect(fixture.componentInstance.resolvedProvider()).toBe('hls');
    expect(host.querySelector('hlsjs-video')).toBeTruthy();
  });

  it('renders tracks as media children, defaulting kind to subtitles', async () => {
    await setInputs({
      tracks: [
        { src: '/en.vtt', srclang: 'en', label: 'English', default: true },
        { src: '/hi.vtt', srclang: 'hi', label: 'हिन्दी' },
        { src: '/thumbs.vtt', kind: 'metadata', label: 'thumbnails' },
      ],
    });

    const tracks = [...host.querySelectorAll('video > track')];
    expect(tracks.length).toBe(3);
    expect(tracks[0].getAttribute('kind')).toBe('subtitles');
    expect(tracks[0].getAttribute('srclang')).toBe('en');
    expect(tracks[0].hasAttribute('default')).toBe(true);
    expect(tracks[1].getAttribute('label')).toBe('हिन्दी');
    expect(tracks[1].hasAttribute('default')).toBe(false);
    expect(tracks[2].getAttribute('kind')).toBe('metadata');
  });

  it('swaps the whole element pair for the live skin, keeping the media', async () => {
    await setInputs({ src: 'https://example.com/live.m3u8', skin: 'live', streamType: 'live' });

    expect(host.querySelector('live-video-player > live-video-skin > hlsjs-video')).toBeTruthy();
    expect(host.querySelector('video-player')).toBeNull();
    expect(host.querySelector('hlsjs-video')?.getAttribute('stream-type')).toBe('live');

    await setInputs({ skin: 'video' });
    expect(host.querySelector('video-player > video-skin > hlsjs-video')).toBeTruthy();
    expect(host.querySelector('live-video-player')).toBeNull();
  });

  it('wraps the player in the i18n provider', async () => {
    const provider = host.querySelector('media-i18n > video-player');
    expect(provider).toBeTruthy();
    // Empty lang follows the nearest lang attribute rather than forcing English.
    expect(host.querySelector('media-i18n')?.hasAttribute('lang')).toBe(false);

    await setInputs({ lang: 'hi' });
    expect(host.querySelector('media-i18n')?.getAttribute('lang')).toBe('hi');
  });

  it('passes stream-type and the disable flags to the media element', async () => {
    await setInputs({
      src: 'https://example.com/live.m3u8',
      streamType: 'live',
      disablePictureInPicture: '',
      disableRemotePlayback: '',
    });

    const media = host.querySelector('hlsjs-video')!;
    expect(media.getAttribute('stream-type')).toBe('live');
    expect(media.hasAttribute('disablepictureinpicture')).toBe(true);
    expect(media.hasAttribute('disableremoteplayback')).toBe(true);

    await setInputs({ streamType: '' });
    expect(media.hasAttribute('stream-type')).toBe(false);
  });

  it('keeps tracks with the media element when the provider changes', async () => {
    await setInputs({
      src: 'https://example.com/stream.m3u8',
      tracks: [{ src: '/en.vtt', srclang: 'en', label: 'English' }],
    });

    expect(host.querySelectorAll('hlsjs-video > track').length).toBe(1);

    // Embeds are iframes — a <track> child would have nothing to attach to.
    await setInputs({ src: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(host.querySelector('track')).toBeNull();
  });
});

describe('NgxVideoPlayer custom skin', () => {
  let fixture: ComponentFixture<NgxVideoPlayer>;
  let host: HTMLElement;

  const setInputs = async (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };

  const has = (selector: string) => !!host.querySelector(selector);

  beforeEach(async () => {
    fixture = TestBed.createComponent(NgxVideoPlayer);
    fixture.componentRef.setInput('src', 'https://example.com/video.mp4');
    fixture.componentRef.setInput('skin', 'custom');
    fixture.componentRef.setInput('poster', 'https://example.com/poster.webp');
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders the ejected skin in light DOM with everything on by default', () => {
    expect(has('video-player > ngx-video-skin media-container.media-default-skin')).toBe(true);
    // The packaged skin elements are gone — this is our own template now.
    expect(has('video-skin')).toBe(false);

    for (const part of [
      'media-play-button',
      'media-mute-button',
      'media-volume-slider',
      'media-time-slider',
      'media-captions-button',
      'media-cast-button',
      'media-airplay-button',
      'media-pip-button',
      'media-fullscreen-button',
      'media-buffering-indicator',
      'media-error-dialog',
      'media-status-announcer',
      'media-seek-indicator',
    ]) {
      expect(has(part)).toBe(true);
    }
  });

  it('wraps the poster in media-poster rather than the slot the packaged skins use', () => {
    expect(has('media-poster > img')).toBe(true);
    expect(has('[slot="poster"]')).toBe(false);
  });

  it('keeps the media element projected in, whichever provider it is', async () => {
    expect(has('media-container > video')).toBe(true);

    await setInputs({ src: 'https://example.com/stream.m3u8' });
    expect(has('media-container > hlsjs-video')).toBe(true);
  });

  it('removes a control from the DOM rather than hiding it', async () => {
    await setInputs({ controls: { progressBar: false } });

    expect(has('media-time-slider')).toBe(false);
    expect(has('media-time-slider media-slider-thumb')).toBe(false);
    // The volume slider keeps its own thumb.
    expect(has('media-volume-slider media-slider-thumb')).toBe(true);
    // Its neighbours are untouched.
    expect(has('media-play-button')).toBe(true);
    expect(has('media-time[type="current"]')).toBe(true);
  });

  it('drops the shortcuts that duplicate a removed control', async () => {
    const keys = () =>
      [...host.querySelectorAll('media-hotkey')].map((k) => k.getAttribute('keys'));
    const gestureActions = () =>
      [...host.querySelectorAll('media-gesture')].map((g) => g.getAttribute('action'));

    expect(keys()).toContain('ArrowRight');
    expect(keys()).toContain('0-9');

    // No seek bar means no seeking — from anywhere.
    await setInputs({ controls: { progressBar: false } });
    expect(keys()).not.toContain('ArrowRight');
    expect(keys()).not.toContain('j');
    expect(keys()).not.toContain('0-9');
    expect(keys()).toContain('Space');
    expect(gestureActions()).not.toContain('seekStep');
    expect(has('media-seek-indicator')).toBe(false);

    await setInputs({ controls: { fullscreenButton: false, muteButton: false } });
    expect(keys()).not.toContain('f');
    expect(keys()).not.toContain('m');
    expect(keys()).not.toContain('ArrowUp');

    // A submenu only reaches the viewer through the settings menu, so closing
    // the parent has to take the shortcut with it.
    await setInputs({ controls: { settingsMenu: false, captionsButton: false } });
    expect(keys()).not.toContain('>');
    expect(keys()).not.toContain('<');
    expect(keys()).not.toContain('c');
  });

  it('drops a container once nothing is left inside it', async () => {
    await setInputs({
      controls: {
        castButton: false,
        airplayButton: false,
        pipButton: false,
        fullscreenButton: false,
      },
    });
    expect(has('.media-controls--secondary')).toBe(false);

    await setInputs({
      controls: { qualityMenu: false, audioMenu: false, speedMenu: false, captionsMenu: false },
    });
    expect(has('#settings-trigger')).toBe(false);
    expect(has('#settings-menu')).toBe(false);

    await setInputs({ controls: { controlBar: false } });
    expect(has('media-controls')).toBe(false);
    expect(has('media-play-button')).toBe(false);
    // The media and the layers around it survive.
    expect(has('media-container > video')).toBe(true);
    expect(has('media-buffering-indicator')).toBe(true);
  });

  it('keeps the radio-group item templates parseable by Video.js', () => {
    const group = host.querySelector('media-quality-radio-group')!;
    const template = group.querySelector('template') as HTMLTemplateElement;
    // Video.js reads template.content, not the light children.
    expect(template.content.firstElementChild?.localName).toBe('media-menu-radio-item');
  });
});

describe('NgxVideoPlayer content projection', () => {
  @Component({
    imports: [NgxVideoPlayer],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
      <ngx-video-player src="https://example.com/video.mp4">
        <media-hotkey keys="n" action="seekStep" value="30"></media-hotkey>
      </ngx-video-player>
    `,
  })
  class Host {}

  it('projects extra Video.js elements alongside the media', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const hotkey = (fixture.nativeElement as HTMLElement).querySelector(
      'video-skin > media-hotkey',
    );
    expect(hotkey).toBeTruthy();
    expect(hotkey?.getAttribute('action')).toBe('seekStep');
  });
});
